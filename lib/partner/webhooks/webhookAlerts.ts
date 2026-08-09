// FILE: lib/partner/webhooks/webhookAlerts.ts
// Operational email alerts for partner webhooks — metadata only, DB-backed cooldown.

import { getAdminEmails } from "@/lib/adminAuth";
import {
  adminEmailShell,
  adminEmailTable,
  sendOperationalAdminEmail,
} from "@/lib/notify/adminResend";
import { dispatcherErrorMetadata } from "@/lib/partner/webhooks/webhookDispatchError";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const WEBHOOK_ALERT_KEYS = [
  "dispatcher_execution_failure",
  "terminal_delivery_failure",
  "excessive_backlog",
  "dispatcher_stale",
  "signing_secret_failure",
] as const;

export type WebhookAlertKey = (typeof WEBHOOK_ALERT_KEYS)[number];

export const WEBHOOK_ALERT_COOLDOWN_MS = 60 * 60 * 1000;
export const WEBHOOK_ALERT_CLAIM_TTL_MS = 2 * 60 * 1000;
export const WEBHOOK_BACKLOG_ALERT_THRESHOLD = 50;
export const WEBHOOK_DISPATCHER_STALE_MS = 15 * 60 * 1000;

const ALERT_STATE = "partner_webhook_alert_state";

export type WebhookAlertSafeMetadata = Record<string, string | number | boolean | null>;

const ALERT_LABELS: Record<WebhookAlertKey, string> = {
  dispatcher_execution_failure: "Dispatcher execution failure",
  terminal_delivery_failure: "Terminal delivery failure",
  excessive_backlog: "Excessive pending/retrying backlog",
  dispatcher_stale: "Dispatcher stale (no recent success)",
  signing_secret_failure: "Signing secret decryption/configuration failure",
};

const SAFE_METADATA_STRING_KEYS = new Set([
  "error_category",
  "error_fingerprint",
]);

export function isPartnerWebhookAlertsEnabled(): boolean {
  return process.env.PARTNER_WEBHOOK_ALERTS_ENABLED?.trim() === "true";
}

export function getPartnerWebhookAlertsStatus(): {
  enabled: boolean;
  configured: boolean;
  recipient_count: number;
  message: string;
  missing: string[];
} {
  const enabled = isPartnerWebhookAlertsEnabled();
  const missing: string[] = [];

  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.EMAIL_FROM?.trim()) missing.push("EMAIL_FROM");
  if (getAdminEmails().length === 0) missing.push("ABRAXAS_ADMIN_EMAILS");

  const configured = enabled && missing.length === 0;
  const recipientCount = getAdminEmails().length;

  let message = "Operational email alerts are configured.";
  if (!enabled) {
    message = "Operational email alerts are disabled. Set PARTNER_WEBHOOK_ALERTS_ENABLED=true to enable.";
  } else if (missing.length > 0) {
    message = `Alert email missing configuration: ${missing.join(", ")}.`;
  }

  return {
    enabled,
    configured,
    recipient_count: recipientCount,
    message,
    missing,
  };
}

function sanitizeMetadata(metadata: WebhookAlertSafeMetadata): WebhookAlertSafeMetadata {
  const safe: WebhookAlertSafeMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      if (SAFE_METADATA_STRING_KEYS.has(key)) {
        safe[key] = value.slice(0, 64);
      }
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
  }
  return safe;
}

function alertEmailHtml(input: {
  title: string;
  recovery: boolean;
  metadata: WebhookAlertSafeMetadata;
}): string {
  const rows: Record<string, string | number | null> = {
    Status: input.recovery ? "Recovered" : "Active",
    "Checked at": new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(input.metadata).map(([k, v]) => [k, v === null ? null : String(v)]),
    ),
  };
  return adminEmailShell(
    input.recovery ? `${input.title} — recovered` : input.title,
    adminEmailTable(rows),
  );
}

type ClaimResult =
  | { claimed: true; claim_id: string; kind: "alert" | "recovery" }
  | { claimed: false; reason: string };

type FinalizeResult =
  | { finalized: true; released?: boolean }
  | { finalized: false; reason: string };

async function claimAlertDelivery(input: {
  alertKey: WebhookAlertKey;
  kind: "alert" | "recovery";
  now: Date;
}): Promise<ClaimResult> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("claim_partner_webhook_alert_delivery", {
    p_alert_key: input.alertKey,
    p_kind: input.kind,
    p_now: input.now.toISOString(),
    p_claim_ttl_seconds: Math.floor(WEBHOOK_ALERT_CLAIM_TTL_MS / 1000),
    p_cooldown_seconds: Math.floor(WEBHOOK_ALERT_COOLDOWN_MS / 1000),
  });

  if (error) {
    console.error("[webhookAlerts] claim failed", input.alertKey, error.message);
    return { claimed: false, reason: "claim_error" };
  }

  const body = data as { claimed?: boolean; claim_id?: string; kind?: string; reason?: string };
  if (!body?.claimed || !body.claim_id) {
    return { claimed: false, reason: body?.reason ?? "not_claimed" };
  }

  return {
    claimed: true,
    claim_id: body.claim_id,
    kind: body.kind === "recovery" ? "recovery" : "alert",
  };
}

async function finalizeAlertDelivery(input: {
  alertKey: WebhookAlertKey;
  claimId: string;
  kind: "alert" | "recovery";
  success: boolean;
  safeMetadata: WebhookAlertSafeMetadata;
  now: Date;
}): Promise<FinalizeResult> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("finalize_partner_webhook_alert_delivery", {
    p_alert_key: input.alertKey,
    p_claim_id: input.claimId,
    p_kind: input.kind,
    p_success: input.success,
    p_safe_metadata: input.safeMetadata,
    p_now: input.now.toISOString(),
    p_cooldown_seconds: Math.floor(WEBHOOK_ALERT_COOLDOWN_MS / 1000),
  });

  if (error) {
    console.error("[webhookAlerts] finalize failed", input.alertKey, error.message);
    return { finalized: false, reason: "finalize_error" };
  }

  const body = data as { finalized?: boolean; reason?: string };
  if (!body?.finalized) {
    return { finalized: false, reason: body?.reason ?? "not_finalized" };
  }

  return { finalized: true, released: Boolean((data as { released?: boolean }).released) };
}

export async function syncWebhookAlert(input: {
  alertKey: WebhookAlertKey;
  active: boolean;
  metadata?: WebhookAlertSafeMetadata;
  now?: Date;
}): Promise<{ sent: boolean; kind: "alert" | "recovery" | "skipped" }> {
  const status = getPartnerWebhookAlertsStatus();
  if (!status.configured) {
    return { sent: false, kind: "skipped" };
  }

  const now = input.now ?? new Date();
  const safeMetadata = sanitizeMetadata(input.metadata ?? {});
  const label = ALERT_LABELS[input.alertKey];
  const kind = input.active ? "alert" : "recovery";

  const claim = await claimAlertDelivery({ alertKey: input.alertKey, kind, now });
  if (!claim.claimed) {
    return { sent: false, kind: "skipped" };
  }

  const sendResult = await sendOperationalAdminEmail({
    subject: input.active
      ? `[Abraxas Webhooks] ${label}`
      : `[Abraxas Webhooks] ${label} — recovered`,
    html: alertEmailHtml({
      title: label,
      recovery: !input.active,
      metadata: safeMetadata,
    }),
  });

  if (sendResult.skipped || !sendResult.ok) {
    await finalizeAlertDelivery({
      alertKey: input.alertKey,
      claimId: claim.claim_id,
      kind: claim.kind,
      success: false,
      safeMetadata,
      now,
    });
    return { sent: false, kind: "skipped" };
  }

  const finalized = await finalizeAlertDelivery({
    alertKey: input.alertKey,
    claimId: claim.claim_id,
    kind: claim.kind,
    success: true,
    safeMetadata,
    now,
  });

  if (!finalized.finalized) {
    return { sent: false, kind: "skipped" };
  }

  return { sent: true, kind: claim.kind };
}

export async function getActiveWebhookAlerts(): Promise<Array<{
  alert_key: WebhookAlertKey;
  updated_at: string;
  safe_metadata: WebhookAlertSafeMetadata;
}>> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from(ALERT_STATE)
    .select("alert_key, updated_at, safe_metadata")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[webhookAlerts] list active failed", error.message);
    return [];
  }

  return (data ?? []).map(row => ({
    alert_key: row.alert_key as WebhookAlertKey,
    updated_at: row.updated_at as string,
    safe_metadata: (row.safe_metadata as WebhookAlertSafeMetadata) ?? {},
  }));
}

export async function notifyDispatcherExecutionFailure(err: unknown): Promise<void> {
  await syncWebhookAlert({
    alertKey: "dispatcher_execution_failure",
    active: true,
    metadata: dispatcherErrorMetadata(err),
  });
}

export async function clearDispatcherExecutionFailureAlert(): Promise<void> {
  await syncWebhookAlert({
    alertKey: "dispatcher_execution_failure",
    active: false,
    metadata: {},
  });
}
