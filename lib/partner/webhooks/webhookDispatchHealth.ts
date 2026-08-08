// FILE: lib/partner/webhooks/webhookDispatchHealth.ts
// Dispatch run telemetry and scheduler status for operator dashboards.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const DISPATCH_RUNS = "partner_webhook_dispatch_runs";

export function isWebhookDispatchSchedulerConfigured(): boolean {
  return process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED === "true";
}

export function isWebhookCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export async function recordWebhookDispatchRun(input: {
  startedAt: string;
  finishedAt: string;
  success: boolean;
  errorCode?: string | null;
  summary: {
    scanned: number;
    delivered: number;
    retrying: number;
    failed: number;
    skipped: number;
    stale: number;
  };
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  await sb.from(DISPATCH_RUNS).insert({
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    success: input.success,
    error_code: input.errorCode ?? null,
    scanned: input.summary.scanned,
    delivered: input.summary.delivered,
    retrying: input.summary.retrying,
    failed: input.summary.failed,
    skipped: input.summary.skipped,
    stale: input.summary.stale,
  });
}

export async function getWebhookDispatchRunHealth(): Promise<{
  scheduler_configured: boolean;
  cron_secret_configured: boolean;
  scheduler_message: string;
  last_successful_run_at: string | null;
  last_failure_at: string | null;
  last_failure_error_code: string | null;
}> {
  const sb = requireSupabaseAdmin();
  const schedulerConfigured = isWebhookDispatchSchedulerConfigured();
  const cronSecretConfigured = isWebhookCronSecretConfigured();

  const { data: lastSuccess } = await sb
    .from(DISPATCH_RUNS)
    .select("finished_at")
    .eq("success", true)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastFailure } = await sb
    .from(DISPATCH_RUNS)
    .select("finished_at, error_code")
    .eq("success", false)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let schedulerMessage = "Dispatch scheduler is configured.";
  if (!schedulerConfigured) {
    schedulerMessage = "Dispatch scheduler not yet configured. Add Vercel cron or an external scheduler calling /api/cron/partner-webhook-dispatch.";
  } else if (!cronSecretConfigured) {
    schedulerMessage = "CRON_SECRET is not set. Dispatch cannot run until it is configured.";
  }

  return {
    scheduler_configured: schedulerConfigured && cronSecretConfigured,
    cron_secret_configured: cronSecretConfigured,
    scheduler_message: schedulerMessage,
    last_successful_run_at: (lastSuccess?.finished_at as string | null) ?? null,
    last_failure_at: (lastFailure?.finished_at as string | null) ?? null,
    last_failure_error_code: (lastFailure?.error_code as string | null) ?? null,
  };
}
