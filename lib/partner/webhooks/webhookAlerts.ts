// FILE: lib/partner/webhooks/webhookAlerts.ts
// Operational email alerts for partner webhooks — metadata only, DB-backed cooldown.

import { getAdminEmails } from "@/lib/adminAuth";
import {
  adminEmailShell,
  adminEmailTable,
  sendOperationalAdminEmail,
} from "@/lib/notify/adminResend";
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
export const WEBHOOK_BACKLOG_ALERT_THRESHOLD = 50;
export const WEBHOOK_DISPATCHER_STALE_MS = 15 * 60 * 1000;

const ALERT_STATE = "partner_webhook_alert_state";

export type WebhookAlertSafeMetadata = Record<string, string | number | boolean | null>;

interface AlertStateRow {
  alert_key: WebhookAlertKey;
  is_active: boolean;
  last_sent_at: string | null;
  last_recovery_at: string | null;
  cooldown_until: string | null;
  safe_metadata: WebhookAlertSafeMetadata;
  updated_at: string;
}

const ALERT_LABELS: Record<WebhookAlertKey, string> = {
  dispatcher_execution_failure: "Dispatcher execution failure",
  terminal_delivery_failure: "Terminal delivery failure",
  excessive_backlog: "Excessive pending/retrying backlog",
  dispatcher_stale: "Dispatcher stale (no recent success)",
  signing_secret_failure: "Signing secret decryption/configuration failure",
};

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
      safe[key] = value.slice(0, 240);
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

async function loadAlertState(alertKey: WebhookAlertKey): Promise<AlertStateRow | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from(ALERT_STATE)
    .select("*")
    .eq("alert_key", alertKey)
    .maybeSingle();

  if (error) {
    console.error("[webhookAlerts] load state failed", alertKey, error.message);
    return null;
  }
  return data as AlertStateRow | null;
}

async function persistAlertState(input: {
  alertKey: WebhookAlertKey;
  isActive: boolean;
  safeMetadata: WebhookAlertSafeMetadata;
  lastSentAt?: string | null;
  lastRecoveryAt?: string | null;
  cooldownUntil?: string | null;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb.from(ALERT_STATE).upsert({
    alert_key: input.alertKey,
    is_active: input.isActive,
    safe_metadata: input.safeMetadata,
    last_sent_at: input.lastSentAt ?? null,
    last_recovery_at: input.lastRecoveryAt ?? null,
    cooldown_until: input.cooldownUntil ?? null,
    updated_at: now,
  }, { onConflict: "alert_key" });

  if (error) {
    console.error("[webhookAlerts] persist state failed", input.alertKey, error.message);
  }
}

function isCooldownActive(row: AlertStateRow | null, nowMs: number): boolean {
  if (!row?.cooldown_until) return false;
  return Date.parse(row.cooldown_until) > nowMs;
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
  const nowMs = now.getTime();
  const safeMetadata = sanitizeMetadata(input.metadata ?? {});
  const existing = await loadAlertState(input.alertKey);
  const label = ALERT_LABELS[input.alertKey];

  if (input.active) {
    if (existing?.is_active && isCooldownActive(existing, nowMs)) {
      return { sent: false, kind: "skipped" };
    }

    const sendResult = await sendOperationalAdminEmail({
      subject: `[Abraxas Webhooks] ${label}`,
      html: alertEmailHtml({ title: label, recovery: false, metadata: safeMetadata }),
    });

    if (sendResult.skipped) {
      return { sent: false, kind: "skipped" };
    }

    const cooldownUntil = new Date(nowMs + WEBHOOK_ALERT_COOLDOWN_MS).toISOString();
    await persistAlertState({
      alertKey: input.alertKey,
      isActive: true,
      safeMetadata,
      lastSentAt: now.toISOString(),
      lastRecoveryAt: existing?.last_recovery_at ?? null,
      cooldownUntil,
    });

    return { sent: sendResult.ok, kind: "alert" };
  }

  if (!existing?.is_active) {
    return { sent: false, kind: "skipped" };
  }

  const sendResult = await sendOperationalAdminEmail({
    subject: `[Abraxas Webhooks] ${label} — recovered`,
    html: alertEmailHtml({ title: label, recovery: true, metadata: safeMetadata }),
  });

  if (sendResult.skipped) {
    return { sent: false, kind: "skipped" };
  }

  await persistAlertState({
    alertKey: input.alertKey,
    isActive: false,
    safeMetadata,
    lastSentAt: existing.last_sent_at,
    lastRecoveryAt: now.toISOString(),
    cooldownUntil: null,
  });

  return { sent: sendResult.ok, kind: "recovery" };
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

export async function notifyDispatcherExecutionFailure(errorCode: string): Promise<void> {
  await syncWebhookAlert({
    alertKey: "dispatcher_execution_failure",
    active: true,
    metadata: { error_code: errorCode.slice(0, 120) },
  });
}

export async function clearDispatcherExecutionFailureAlert(): Promise<void> {
  await syncWebhookAlert({
    alertKey: "dispatcher_execution_failure",
    active: false,
    metadata: {},
  });
}
