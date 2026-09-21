// FILE: lib/partner/receiptLifecycle/enqueue.ts
// Partner-scoped lifecycle enqueue. Fail closed. Never a live send.

import { enqueuePartnerWebhookEvent, enqueuePartnerWebhookEventBestEffort } from "@/lib/partner/webhooks/webhookOutbox";
import type { PartnerWebhookEventType } from "@/lib/partner/webhooks/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  RECEIPT_LIFECYCLE_TERMINAL_TYPES,
  isReceiptLifecycleEventType,
  type ReceiptLifecycleEventType,
} from "./contract";
import { buildReceiptLifecycleEnvelope, lifecycleEnvelopeLeaks } from "./envelope";

export interface ReceiptLifecycleEnqueueInput {
  partnerId: string;
  eventType: ReceiptLifecycleEventType;
  receiptId: string;
  policyId?: string | null;
  policyVersion?: number | null;
  decisionId?: string | null;
  expiresAt?: string | null;
  reasonCode?: string | null;
}

function storedType(eventType: ReceiptLifecycleEventType): PartnerWebhookEventType {
  if (eventType === "receipt.issued") return "partner.receipt.issued";
  if (eventType === "receipt.revoked") return "partner.receipt.revoked";
  return eventType;
}

export async function enqueueReceiptLifecycleEvent(
  input: ReceiptLifecycleEnqueueInput,
): Promise<{ ok: true; created: boolean; eventId: string } | { ok: false; error: string }> {
  const partnerId = input.partnerId.trim();
  const receiptId = input.receiptId.trim();
  if (!partnerId || !receiptId) return { ok: false, error: "invalid_input" };
  if (!isReceiptLifecycleEventType(input.eventType)) {
    return { ok: false, error: "event_type_not_supported" };
  }

  const occurredAt = new Date().toISOString();
  const envelope = buildReceiptLifecycleEnvelope({
    eventId: `${partnerId}:${input.eventType}:${receiptId}`,
    eventType: input.eventType,
    occurredAt,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    expiresAt: input.expiresAt,
  });
  if (lifecycleEnvelopeLeaks(envelope).length) return { ok: false, error: "redacted" };

  const result = await enqueuePartnerWebhookEvent({
    partnerId,
    eventType: storedType(input.eventType),
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    receiptId,
    decisionId: input.decisionId ?? null,
    reasonCode: input.reasonCode ?? null,
    outcome: envelope.validity_class,
    resourceId: receiptId,
    validityClass: envelope.validity_class,
    expiresAt: envelope.expires_at,
    eventRef: envelope.event_ref,
    mustReverify: true,
    isGrant: false,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, created: result.created, eventId: result.eventId };
}

export function enqueueReceiptLifecycleBestEffort(input: ReceiptLifecycleEnqueueInput): void {
  enqueuePartnerWebhookEventBestEffort({
    partnerId: input.partnerId,
    eventType: storedType(input.eventType),
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    receiptId: input.receiptId,
    decisionId: input.decisionId ?? null,
    reasonCode: input.reasonCode ?? null,
    outcome: input.eventType.split(".")[1] ?? "issued",
    resourceId: input.receiptId,
    validityClass: buildReceiptLifecycleEnvelope({
      eventId: `${input.partnerId}:${input.eventType}:${input.receiptId}`,
      eventType: input.eventType,
      occurredAt: new Date().toISOString(),
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      expiresAt: input.expiresAt,
    }).validity_class,
    expiresAt: input.expiresAt ?? null,
    eventRef: buildReceiptLifecycleEnvelope({
      eventId: `${input.partnerId}:${input.eventType}:${input.receiptId}`,
      eventType: input.eventType,
      occurredAt: new Date().toISOString(),
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      expiresAt: input.expiresAt,
    }).event_ref,
    mustReverify: true,
    isGrant: false,
  });
}

export async function enqueueDerivedInvalidationEvents(sourceReceiptId: string): Promise<number> {
  const id = sourceReceiptId.trim();
  if (!id) return 0;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("reusable_eligibility_derivations")
      .select("derived_receipt_id, requesting_partner_id, requesting_policy_id, requesting_policy_version")
      .eq("source_receipt_id", id)
      .limit(40);
    if (error || !data) return 0;
    let count = 0;
    for (const row of data) {
      const partnerId = String(row.requesting_partner_id ?? "").trim();
      const derivedId = String(row.derived_receipt_id ?? "").trim();
      if (!partnerId || !derivedId) continue;
      enqueueReceiptLifecycleBestEffort({
        partnerId,
        eventType: "receipt.invalidated",
        receiptId: derivedId,
        policyId: typeof row.requesting_policy_id === "string" ? row.requesting_policy_id : null,
        policyVersion: typeof row.requesting_policy_version === "number" ? row.requesting_policy_version : null,
        reasonCode: "derived_invalidated",
      });
      count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

export function isTerminalLifecycleType(eventType: string): boolean {
  return (RECEIPT_LIFECYCLE_TERMINAL_TYPES as readonly string[]).includes(eventType);
}
