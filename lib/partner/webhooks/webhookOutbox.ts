// FILE: lib/partner/webhooks/webhookOutbox.ts
// Durable partner webhook outbox — enqueue is best-effort and non-blocking.

import { randomUUID } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildPartnerWebhookPayload,
  buildWebhookIdempotencyKey,
  webhookPayloadHasNoPii,
} from "@/lib/partner/webhooks/webhookPayloadContract";
import type {
  PartnerWebhookEventType,
  PartnerWebhookOutboxRecord,
  PartnerWebhookPayload,
  PartnerWebhookStatus,
} from "@/lib/partner/webhooks/types";

const OUTBOX = "partner_webhook_outbox";
const CONFIG = "partner_webhook_configs";

function mapOutboxRow(row: Record<string, unknown>): PartnerWebhookOutboxRecord {
  return {
    id: row.id as string,
    partner_id: row.partner_id as string,
    event_type: row.event_type as PartnerWebhookEventType,
    event_id: row.event_id as string,
    idempotency_key: row.idempotency_key as string,
    payload: row.payload as PartnerWebhookPayload,
    occurred_at: row.occurred_at as string,
    status: row.status as PartnerWebhookStatus,
    attempt_count: row.attempt_count as number,
    next_attempt_at: row.next_attempt_at as string,
    delivered_at: (row.delivered_at as string | null) ?? null,
    last_error_code: (row.last_error_code as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function isPartnerWebhookEnabled(partnerId: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from(CONFIG)
    .select("enabled")
    .eq("partner_id", partnerId)
    .maybeSingle();
  return Boolean(data?.enabled);
}

export async function enqueuePartnerWebhookEvent(input: {
  partnerId: string;
  eventType: PartnerWebhookEventType;
  occurredAt?: string;
  policyId?: string | null;
  receiptId?: string | null;
  decisionId?: string | null;
  reasonCode?: string | null;
  resourceId: string;
}): Promise<{ ok: true; eventId: string; created: boolean } | { ok: false; error: string }> {
  const partnerId = input.partnerId.trim();
  if (!partnerId) return { ok: false, error: "partner_id_required" };

  const enabled = await isPartnerWebhookEnabled(partnerId);
  if (!enabled) return { ok: false, error: "webhook_disabled" };

  const eventId = randomUUID();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const payload = buildPartnerWebhookPayload({
    eventId,
    eventType: input.eventType,
    occurredAt,
    partnerId,
    policyId: input.policyId ?? null,
    receiptId: input.receiptId ?? null,
    decisionId: input.decisionId ?? null,
    reasonCode: input.reasonCode ?? null,
  });

  if (!webhookPayloadHasNoPii(payload)) {
    return { ok: false, error: "payload_contains_pii" };
  }

  const idempotencyKey = buildWebhookIdempotencyKey({
    partnerId,
    eventType: input.eventType,
    resourceId: input.resourceId,
  });

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from(OUTBOX)
    .insert({
      partner_id: partnerId,
      event_type: input.eventType,
      event_id: eventId,
      idempotency_key: idempotencyKey,
      payload,
      occurred_at: occurredAt,
      status: "pending",
      next_attempt_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await sb
        .from(OUTBOX)
        .select("event_id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing?.event_id) {
        return { ok: true, eventId: existing.event_id as string, created: false };
      }
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, eventId: mapOutboxRow(data).event_id, created: true };
}

/** Fire-and-forget — never blocks Partner Flow, revocation, or privacy paths. */
export function enqueuePartnerWebhookEventBestEffort(
  input: Parameters<typeof enqueuePartnerWebhookEvent>[0],
): void {
  void enqueuePartnerWebhookEvent(input).catch((err: unknown) => {
    console.warn(
      "partner webhook enqueue best-effort failed:",
      err instanceof Error ? err.message : String(err),
    );
  });
}

export async function listDispatchableWebhookEvents(limit = 25): Promise<PartnerWebhookOutboxRecord[]> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data } = await sb
    .from(OUTBOX)
    .select("*")
    .in("status", ["pending", "retrying"])
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map(mapOutboxRow);
}

export async function listPartnerWebhookDeliveries(input: {
  partnerId: string;
  limit?: number;
}): Promise<Array<{
  event_id: string;
  event_type: PartnerWebhookEventType;
  status: PartnerWebhookStatus;
  occurred_at: string;
  delivered_at: string | null;
  attempt_count: number;
  last_error_code: string | null;
}>> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from(OUTBOX)
    .select("event_id, event_type, status, occurred_at, delivered_at, attempt_count, last_error_code")
    .eq("partner_id", input.partnerId)
    .order("occurred_at", { ascending: false })
    .limit(Math.min(input.limit ?? 50, 100));

  return (data ?? []) as Array<{
    event_id: string;
    event_type: PartnerWebhookEventType;
    status: PartnerWebhookStatus;
    occurred_at: string;
    delivered_at: string | null;
    attempt_count: number;
    last_error_code: string | null;
  }>;
}

export async function getWebhookDeliveryHealth(): Promise<Record<PartnerWebhookStatus, number>> {
  const sb = requireSupabaseAdmin();
  const counts: Record<PartnerWebhookStatus, number> = {
    pending: 0,
    delivering: 0,
    delivered: 0,
    retrying: 0,
    failed: 0,
  };

  const { data } = await sb.from(OUTBOX).select("status");
  for (const row of data ?? []) {
    const status = row.status as PartnerWebhookStatus;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

export { mapOutboxRow };
