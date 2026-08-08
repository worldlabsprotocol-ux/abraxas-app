// FILE: lib/partner/webhooks/webhookDeadLetter.ts
// Failed delivery listing and admin manual retry (same event_id + payload).

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { PartnerWebhookEventType } from "@/lib/partner/webhooks/types";
import { isPartnerWebhookEnabled } from "@/lib/partner/webhooks/webhookOutbox";

const OUTBOX = "partner_webhook_outbox";
const RETRY_AUDIT = "partner_webhook_retry_audit";

export interface FailedWebhookDeliveryRecord {
  outbox_id: string;
  partner_id: string;
  event_type: PartnerWebhookEventType;
  event_id: string;
  last_error_code: string | null;
  attempt_count: number;
  occurred_at: string;
  updated_at: string;
}

export async function listFailedWebhookDeliveries(input?: {
  partnerId?: string;
  limit?: number;
}): Promise<FailedWebhookDeliveryRecord[]> {
  const sb = requireSupabaseAdmin();
  let query = sb
    .from(OUTBOX)
    .select("id, partner_id, event_type, event_id, last_error_code, attempt_count, occurred_at, updated_at")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(Math.min(input?.limit ?? 50, 100));

  if (input?.partnerId?.trim()) {
    query = query.eq("partner_id", input.partnerId.trim());
  }

  const { data } = await query;
  return (data ?? []).map(row => ({
    outbox_id: row.id as string,
    partner_id: row.partner_id as string,
    event_type: row.event_type as PartnerWebhookEventType,
    event_id: row.event_id as string,
    last_error_code: (row.last_error_code as string | null) ?? null,
    attempt_count: row.attempt_count as number,
    occurred_at: row.occurred_at as string,
    updated_at: row.updated_at as string,
  }));
}

/**
 * Requeue a failed outbox event for dispatch without creating a new event_id,
 * payload, or Partner Flow receipt. Audits the operator action.
 */
export async function requeueFailedWebhookDelivery(input: {
  outboxId: string;
  retriedBy?: string;
}): Promise<{ ok: true; event_id: string } | { ok: false; error: string }> {
  const sb = requireSupabaseAdmin();
  const { data: row } = await sb
    .from(OUTBOX)
    .select("id, partner_id, event_type, event_id, status, last_error_code, attempt_count, payload")
    .eq("id", input.outboxId)
    .maybeSingle();

  if (!row) return { ok: false, error: "event_not_found" };
  if (row.status !== "failed") return { ok: false, error: "event_not_failed" };

  const partnerId = row.partner_id as string;
  const enabled = await isPartnerWebhookEnabled(partnerId);
  if (!enabled) return { ok: false, error: "webhook_disabled" };

  const now = new Date().toISOString();
  const { data: updated, error } = await sb
    .from(OUTBOX)
    .update({
      status: "pending",
      next_attempt_at: now,
      last_error_code: null,
      delivered_at: null,
      attempt_count: 0,
      delivery_lease_until: null,
      delivery_worker_id: null,
      delivery_claim_id: null,
      delivery_attempt_number: null,
      updated_at: now,
    })
    .eq("id", input.outboxId)
    .eq("status", "failed")
    .select("event_id")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "requeue_failed" };
  }

  await sb.from(RETRY_AUDIT).insert({
    outbox_event_id: input.outboxId,
    event_id: row.event_id as string,
    partner_id: partnerId,
    event_type: row.event_type as string,
    retried_by: input.retriedBy ?? "admin",
    prior_status: "failed",
    prior_error_code: (row.last_error_code as string | null) ?? null,
    prior_attempt_count: row.attempt_count as number,
  });

  return { ok: true, event_id: updated.event_id as string };
}
