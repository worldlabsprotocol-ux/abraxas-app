// FILE: lib/partner/partnerMetering.ts
// Append-only, idempotent partner metering ledger — billable-quality events only, no PII.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PARTNER_METERING_EVENT_TYPES = {
  partnerFlowReceiptIssued: "partner_flow_receipt_issued",
  partnerApiCall: "partner_api_call",
} as const;

export type PartnerMeteringEventType =
  (typeof PARTNER_METERING_EVENT_TYPES)[keyof typeof PARTNER_METERING_EVENT_TYPES];

export interface PartnerMeteringEventInput {
  partnerId: string;
  eventType: PartnerMeteringEventType;
  idempotencyKey: string;
  occurredAt?: string;
  policyId?: string | null;
  decisionId?: string | null;
  receiptId?: string | null;
  apiKeyId?: string | null;
  endpoint?: string | null;
  method?: string | null;
}

export interface PartnerMeteringRecordResult {
  recorded: boolean;
  duplicate: boolean;
  error?: string;
}

const FORBIDDEN_METERING_FIELD_NAMES = new Set([
  "wallet_address",
  "sui_address",
  "subject_id",
  "email",
  "holder_email",
]);

const FORBIDDEN_METERING_VALUE_PATTERNS = [
  "@",
  "0x",
  "jwt.",
  "bearer ",
  "oauth",
  "biometric",
] as const;

export function partnerMeteringPayloadHasNoPii(payload: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (FORBIDDEN_METERING_FIELD_NAMES.has(key.toLowerCase())) return false;
    const text = String(value).toLowerCase();
    if (FORBIDDEN_METERING_VALUE_PATTERNS.some(pattern => text.includes(pattern))) {
      return false;
    }
  }
  return true;
}

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function buildPartnerFlowReceiptMeteringKey(receiptId: string): string {
  return `meter:pf_receipt:${receiptId}`;
}

export function buildPartnerApiMeteringKey(input: {
  partnerId: string;
  method: string;
  endpoint: string;
  correlationId: string;
}): string {
  const endpoint = input.endpoint.replace(/\/+$/, "") || "/";
  return `meter:api:${input.partnerId}:${input.method.toUpperCase()}:${endpoint}:${input.correlationId}`;
}

export function resolvePartnerApiMeteringCorrelationId(input: {
  recordId?: string | null;
  proofId?: string | null;
  endpoint: string;
  method: string;
  apiKeyId?: string | null;
  httpStatus?: number;
}): string | null {
  const recordId = input.recordId?.trim();
  if (recordId) return recordId;

  const proofId = input.proofId?.trim();
  if (proofId) return proofId;

  const pathMatch = input.endpoint.match(/\/([0-9a-f-]{36}|dr_[a-zA-Z0-9_-]+)(?:\/|$)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
}

export async function recordPartnerMeteringEvent(
  input: PartnerMeteringEventInput,
): Promise<PartnerMeteringRecordResult> {
  const partnerId = input.partnerId?.trim();
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!partnerId || !idempotencyKey) {
    return { recorded: false, duplicate: false, error: "missing_partner_or_idempotency_key" };
  }

  const payload = {
    partner_id: partnerId,
    event_type: input.eventType,
    idempotency_key: idempotencyKey,
    policy_id: input.policyId ?? null,
    decision_id: input.decisionId ?? null,
    receipt_id: input.receiptId ?? null,
    api_key_id: input.apiKeyId ?? null,
    endpoint: input.endpoint ?? null,
    method: input.method ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  };

  if (!partnerMeteringPayloadHasNoPii(payload)) {
    return { recorded: false, duplicate: false, error: "pii_rejected" };
  }

  const client = sb();
  if (!client) {
    return { recorded: false, duplicate: false, error: "metering_unavailable" };
  }

  const { error } = await client.from("partner_metering_events").insert(payload);

  if (!error) {
    return { recorded: true, duplicate: false };
  }

  if (error.code === "23505") {
    return { recorded: false, duplicate: true };
  }

  console.warn("partner_metering_events insert failed:", error.message);
  return { recorded: false, duplicate: false, error: "insert_failed" };
}

/** Fire-and-forget — never blocks verification or API success paths. */
export function recordPartnerMeteringEventBestEffort(input: PartnerMeteringEventInput): void {
  void recordPartnerMeteringEvent(input).catch((err: unknown) => {
    console.warn("partner metering best-effort failed:", err instanceof Error ? err.message : String(err));
  });
}

export async function recordPartnerFlowReceiptMetering(input: {
  partnerId: string;
  receiptId: string;
  policyId?: string | null;
  decisionId?: string | null;
  /** When false, skip billable event (incomplete issuance). */
  issuanceAuthorizable?: boolean;
}): Promise<PartnerMeteringRecordResult> {
  const receiptId = input.receiptId?.trim();
  if (!receiptId) {
    return { recorded: false, duplicate: false, error: "missing_receipt_id" };
  }
  if (input.issuanceAuthorizable === false) {
    return { recorded: false, duplicate: false, error: "issuance_not_finalized" };
  }
  if (input.issuanceAuthorizable === undefined) {
    const { getReceiptById } = await import("@/lib/decisionReceipts/service");
    const { isReceiptPendingEvidenceFinalization, issuanceFinalizationInvalidationReasons } = await import(
      "@/lib/decisionReceipts/issuanceFinalization",
    );
    const record = await getReceiptById(receiptId);
    if (
      !record
      || isReceiptPendingEvidenceFinalization(record)
      || issuanceFinalizationInvalidationReasons(record).length > 0
    ) {
      return { recorded: false, duplicate: false, error: "issuance_not_finalized" };
    }
  }

  return recordPartnerMeteringEvent({
    partnerId: input.partnerId,
    eventType: PARTNER_METERING_EVENT_TYPES.partnerFlowReceiptIssued,
    idempotencyKey: buildPartnerFlowReceiptMeteringKey(receiptId),
    policyId: input.policyId ?? null,
    decisionId: input.decisionId ?? null,
    receiptId,
  });
}

export function recordPartnerFlowReceiptMeteringBestEffort(input: {
  partnerId: string;
  receiptId: string;
  policyId?: string | null;
  decisionId?: string | null;
}): void {
  void recordPartnerFlowReceiptMetering(input).catch((err: unknown) => {
    console.warn("partner flow receipt metering failed:", err instanceof Error ? err.message : String(err));
  });
}
