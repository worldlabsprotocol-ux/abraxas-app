// FILE: lib/partner/webhooks/webhookHealthMonitor.ts
// Periodic health evaluation for partner webhook operational alerts.

import {
  getWebhookDispatchRunHealth,
  isWebhookDispatchSchedulerConfigured,
} from "@/lib/partner/webhooks/webhookDispatchHealth";
import {
  syncWebhookAlert,
  WEBHOOK_BACKLOG_ALERT_THRESHOLD,
  WEBHOOK_DISPATCHER_STALE_MS,
  type WebhookAlertKey,
} from "@/lib/partner/webhooks/webhookAlerts";
import { getWebhookDeliveryHealth } from "@/lib/partner/webhooks/webhookOutbox";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptWebhookSigningSecret } from "@/lib/partner/webhooks/webhookSecretStorage";

const CONFIG = "partner_webhook_configs";

export async function countSigningSecretConfigurationFailures(): Promise<number> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from(CONFIG)
    .select("signing_secret_ciphertext, signing_secret_iv")
    .eq("enabled", true);

  const rows = data ?? [];
  if (rows.length === 0) return 0;

  if (!process.env.ABRAXAS_WEBHOOK_MASTER_KEY?.trim()) {
    return rows.length;
  }

  let failures = 0;
  for (const row of rows) {
    const secret = decryptWebhookSigningSecret({
      ciphertext: row.signing_secret_ciphertext as string,
      iv: row.signing_secret_iv as string,
    });
    if (!secret) failures += 1;
  }
  return failures;
}

export async function evaluateWebhookHealthAlerts(input?: { now?: Date }): Promise<{
  evaluated: WebhookAlertKey[];
  sent: WebhookAlertKey[];
  recovered: WebhookAlertKey[];
}> {
  const now = input?.now ?? new Date();
  const evaluated: WebhookAlertKey[] = [];
  const sent: WebhookAlertKey[] = [];
  const recovered: WebhookAlertKey[] = [];

  const [counts, dispatchHealth, signingFailures] = await Promise.all([
    getWebhookDeliveryHealth(),
    getWebhookDispatchRunHealth(),
    countSigningSecretConfigurationFailures(),
  ]);

  const failedCount = counts.failed;
  evaluated.push("terminal_delivery_failure");
  const terminalResult = await syncWebhookAlert({
    alertKey: "terminal_delivery_failure",
    active: failedCount > 0,
    metadata: { failed_count: failedCount },
    now,
  });
  if (terminalResult.kind === "alert") sent.push("terminal_delivery_failure");
  if (terminalResult.kind === "recovery") recovered.push("terminal_delivery_failure");

  const backlog = counts.pending + counts.retrying;
  evaluated.push("excessive_backlog");
  const backlogResult = await syncWebhookAlert({
    alertKey: "excessive_backlog",
    active: backlog >= WEBHOOK_BACKLOG_ALERT_THRESHOLD,
    metadata: {
      pending: counts.pending,
      retrying: counts.retrying,
      threshold: WEBHOOK_BACKLOG_ALERT_THRESHOLD,
    },
    now,
  });
  if (backlogResult.kind === "alert") sent.push("excessive_backlog");
  if (backlogResult.kind === "recovery") recovered.push("excessive_backlog");

  const schedulerConfigured = isWebhookDispatchSchedulerConfigured()
    && dispatchHealth.cron_secret_configured;
  let dispatcherStale = false;
  let minutesSinceSuccess: number | null = null;

  if (schedulerConfigured) {
    const lastSuccess = dispatchHealth.last_successful_run_at;
    if (!lastSuccess) {
      dispatcherStale = true;
    } else {
      const elapsedMs = now.getTime() - Date.parse(lastSuccess);
      minutesSinceSuccess = Math.floor(elapsedMs / 60_000);
      dispatcherStale = elapsedMs > WEBHOOK_DISPATCHER_STALE_MS;
    }
  }

  evaluated.push("dispatcher_stale");
  const staleResult = await syncWebhookAlert({
    alertKey: "dispatcher_stale",
    active: dispatcherStale,
    metadata: {
      scheduler_configured: schedulerConfigured,
      minutes_since_success: minutesSinceSuccess,
      stale_threshold_minutes: WEBHOOK_DISPATCHER_STALE_MS / 60_000,
    },
    now,
  });
  if (staleResult.kind === "alert") sent.push("dispatcher_stale");
  if (staleResult.kind === "recovery") recovered.push("dispatcher_stale");

  evaluated.push("signing_secret_failure");
  const signingResult = await syncWebhookAlert({
    alertKey: "signing_secret_failure",
    active: signingFailures > 0,
    metadata: {
      affected_enabled_configs: signingFailures,
      master_key_configured: Boolean(process.env.ABRAXAS_WEBHOOK_MASTER_KEY?.trim()),
    },
    now,
  });
  if (signingResult.kind === "alert") sent.push("signing_secret_failure");
  if (signingResult.kind === "recovery") recovered.push("signing_secret_failure");

  return { evaluated, sent, recovered };
}
