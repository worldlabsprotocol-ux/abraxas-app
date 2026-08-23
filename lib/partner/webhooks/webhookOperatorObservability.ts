// FILE: lib/partner/webhooks/webhookOperatorObservability.ts
// Read-only admin webhook delivery observability — no secrets, URLs, or payloads.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getPartnerWebhookConfig } from "@/lib/partner/webhooks/webhookConfigService";
import { getWebhookDispatchRunHealth } from "@/lib/partner/webhooks/webhookDispatchHealth";
import {
  PARTNER_WEBHOOK_STATUSES,
  type PartnerWebhookStatus,
} from "@/lib/partner/webhooks/types";
import { WEBHOOK_NOTIFICATION_DISCLAIMER } from "@/lib/partner/webhooks/webhookPayloadContract";

const OUTBOX = "partner_webhook_outbox";
const ATTEMPTS = "partner_webhook_delivery_attempts";
const DISPATCH_RUNS = "partner_webhook_dispatch_runs";

export const WEBHOOK_OBSERVABILITY_DELIVERY_LIMIT = 50;
export const WEBHOOK_OBSERVABILITY_PARTNER_ID_MAX_LENGTH = 128;
export const WEBHOOK_OBSERVABILITY_EVENT_ID_MAX_LENGTH = 128;

const PARTNER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
const EVENT_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;

export type WebhookDeliveryState =
  | "queued_or_in_flight"
  | "retrying"
  | "delivered"
  | "failed"
  | "unknown";

export type WebhookObservabilityFollowUpReason =
  | "webhook_not_configured"
  | "delivery_not_enabled"
  | "failed_deliveries_present"
  | "retrying_deliveries_present";

export interface WebhookObservabilityStatusCounts {
  pending: number;
  delivering: number;
  retrying: number;
  delivered: number;
  failed: number;
  unknown: number;
}

export interface WebhookObservabilityDeliveryRow {
  event_id: string;
  event_type: string;
  status: string;
  delivery_state: WebhookDeliveryState;
  occurred_at: string;
  delivered_at: string | null;
  attempt_count: number;
  last_error_code: string | null;
}

export interface WebhookObservabilityDispatchSummary {
  scheduler_ready: boolean;
  last_successful_run_at: string | null;
  last_failure_at: string | null;
  last_failure_error_code: string | null;
}

export interface PartnerWebhookObservabilitySnapshot {
  partner_id: string;
  webhook_configured: boolean;
  webhook_delivery_enabled: boolean;
  status_counts: WebhookObservabilityStatusCounts;
  dispatch_summary_available: boolean;
  dispatch_summary?: WebhookObservabilityDispatchSummary;
  follow_up: {
    recommended: boolean;
    reasons: WebhookObservabilityFollowUpReason[];
  };
  deliveries: WebhookObservabilityDeliveryRow[];
  disclaimer: string;
}

export interface WebhookObservabilityAttemptRow {
  attempt_number: number;
  http_status: number | null;
  error_code: string | null;
  attempted_at: string;
}

export function validateObservabilityPartnerId(
  partnerId: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = partnerId.trim();
  if (!trimmed) return { ok: false, error: "partner_id_required" };
  if (trimmed.length > WEBHOOK_OBSERVABILITY_PARTNER_ID_MAX_LENGTH) {
    return { ok: false, error: "partner_id_invalid" };
  }
  if (!PARTNER_ID_PATTERN.test(trimmed)) {
    return { ok: false, error: "partner_id_invalid" };
  }
  return { ok: true, value: trimmed };
}

export function validateObservabilityEventId(
  eventId: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = eventId.trim();
  if (!trimmed) return { ok: false, error: "event_id_required" };
  if (trimmed.length > WEBHOOK_OBSERVABILITY_EVENT_ID_MAX_LENGTH) {
    return { ok: false, error: "event_id_invalid" };
  }
  if (!EVENT_ID_PATTERN.test(trimmed)) {
    return { ok: false, error: "event_id_invalid" };
  }
  return { ok: true, value: trimmed };
}

export function mapWebhookDeliveryState(status: string): WebhookDeliveryState {
  switch (status) {
    case "pending":
    case "delivering":
      return "queued_or_in_flight";
    case "retrying":
      return "retrying";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    default:
      return "unknown";
  }
}

export function buildWebhookObservabilityStatusCounts(
  rows: Array<{ status: string }>,
): WebhookObservabilityStatusCounts {
  const counts: WebhookObservabilityStatusCounts = {
    pending: 0,
    delivering: 0,
    retrying: 0,
    delivered: 0,
    failed: 0,
    unknown: 0,
  };

  const canonical = new Set<string>(PARTNER_WEBHOOK_STATUSES);

  for (const row of rows) {
    const status = row.status;
    if (canonical.has(status)) {
      counts[status as PartnerWebhookStatus] += 1;
    } else {
      counts.unknown += 1;
    }
  }

  return counts;
}

export function deriveWebhookObservabilityFollowUp(input: {
  webhookConfigured: boolean;
  webhookDeliveryEnabled: boolean;
  statusCounts: WebhookObservabilityStatusCounts;
}): { recommended: boolean; reasons: WebhookObservabilityFollowUpReason[] } {
  const reasons: WebhookObservabilityFollowUpReason[] = [];

  if (!input.webhookConfigured) reasons.push("webhook_not_configured");
  if (input.webhookConfigured && !input.webhookDeliveryEnabled) {
    reasons.push("delivery_not_enabled");
  }
  if (input.statusCounts.failed > 0) reasons.push("failed_deliveries_present");
  if (input.statusCounts.retrying > 0) reasons.push("retrying_deliveries_present");

  return {
    recommended: reasons.length > 0,
    reasons,
  };
}

async function loadOptionalDispatchSummary(): Promise<{
  available: boolean;
  summary?: WebhookObservabilityDispatchSummary;
}> {
  const sb = requireSupabaseAdmin();
  const { error: probeError } = await sb
    .from(DISPATCH_RUNS)
    .select("id", { head: true, count: "exact" })
    .limit(0);

  if (probeError) {
    return { available: false };
  }

  try {
    const health = await getWebhookDispatchRunHealth();
    return {
      available: true,
      summary: {
        scheduler_ready: health.scheduler_configured,
        last_successful_run_at: health.last_successful_run_at,
        last_failure_at: health.last_failure_at,
        last_failure_error_code: health.last_failure_error_code,
      },
    };
  } catch {
    return { available: false };
  }
}

export async function getPartnerWebhookObservability(
  partnerId: string,
): Promise<PartnerWebhookObservabilitySnapshot | null> {
  const sb = requireSupabaseAdmin();

  const [config, statusRowsResult, deliveryRowsResult, dispatch] = await Promise.all([
    getPartnerWebhookConfig(partnerId),
    sb.from(OUTBOX).select("status").eq("partner_id", partnerId),
    sb
      .from(OUTBOX)
      .select("event_id, event_type, status, occurred_at, delivered_at, attempt_count, last_error_code")
      .eq("partner_id", partnerId)
      .order("occurred_at", { ascending: false })
      .limit(WEBHOOK_OBSERVABILITY_DELIVERY_LIMIT),
    loadOptionalDispatchSummary(),
  ]);

  if (statusRowsResult.error || deliveryRowsResult.error) {
    return null;
  }

  const webhookConfigured = Boolean(config?.endpoint_url?.trim());
  const webhookDeliveryEnabled = config?.enabled === true;
  const status_counts = buildWebhookObservabilityStatusCounts(statusRowsResult.data ?? []);

  const deliveries: WebhookObservabilityDeliveryRow[] = (deliveryRowsResult.data ?? []).map((row) => ({
    event_id: row.event_id as string,
    event_type: row.event_type as string,
    status: row.status as string,
    delivery_state: mapWebhookDeliveryState(row.status as string),
    occurred_at: row.occurred_at as string,
    delivered_at: (row.delivered_at as string | null) ?? null,
    attempt_count: row.attempt_count as number,
    last_error_code: (row.last_error_code as string | null) ?? null,
  }));

  const follow_up = deriveWebhookObservabilityFollowUp({
    webhookConfigured,
    webhookDeliveryEnabled,
    statusCounts: status_counts,
  });

  return {
    partner_id: partnerId,
    webhook_configured: webhookConfigured,
    webhook_delivery_enabled: webhookDeliveryEnabled,
    status_counts,
    dispatch_summary_available: dispatch.available,
    ...(dispatch.available && dispatch.summary ? { dispatch_summary: dispatch.summary } : {}),
    follow_up,
    deliveries,
    disclaimer:
      "Queued, delivering, or retrying does not mean delivered. Only status delivered indicates completed delivery. "
      + WEBHOOK_NOTIFICATION_DISCLAIMER,
  };
}

export async function getPartnerWebhookDeliveryAttempts(input: {
  partnerId: string;
  eventId: string;
}): Promise<WebhookObservabilityAttemptRow[] | null> {
  const sb = requireSupabaseAdmin();

  const { data: outboxRow, error: outboxError } = await sb
    .from(OUTBOX)
    .select("id")
    .eq("partner_id", input.partnerId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (outboxError || !outboxRow?.id) {
    return null;
  }

  const { data: attempts, error: attemptsError } = await sb
    .from(ATTEMPTS)
    .select("attempt_number, http_status, error_code, attempted_at")
    .eq("outbox_event_id", outboxRow.id as string)
    .order("attempt_number", { ascending: true });

  if (attemptsError) {
    return null;
  }

  return (attempts ?? []).map((row) => ({
    attempt_number: row.attempt_number as number,
    http_status: (row.http_status as number | null) ?? null,
    error_code: (row.error_code as string | null) ?? null,
    attempted_at: row.attempted_at as string,
  }));
}
