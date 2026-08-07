// FILE: lib/partner/partnerMeteringHooks.ts
// Route-level metering hooks — billable events only, never blocks flows.

import type { PartnerUsageEntry } from "@/lib/partner/logPartnerUsage";
import {
  buildPartnerApiMeteringKey,
  PARTNER_METERING_EVENT_TYPES,
  recordPartnerFlowReceiptMeteringBestEffort,
  recordPartnerMeteringEventBestEffort,
  resolvePartnerApiMeteringCorrelationId,
} from "@/lib/partner/partnerMetering";

export function maybeRecordPartnerFlowReceiptMetering(input: {
  partnerId: string;
  replayStatus?: "issued" | "idempotent_replay" | null;
  decision?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  decisionId?: string | null;
  idempotencyKey?: string | null;
}): void {
  if (input.replayStatus !== "issued") return;
  if (input.decision !== "approved") return;

  const receiptId = input.receiptId?.trim();
  if (!receiptId || !input.partnerId?.trim()) return;

  recordPartnerFlowReceiptMeteringBestEffort({
    partnerId: input.partnerId,
    receiptId,
    policyId: input.policyId ?? null,
    decisionId: input.decisionId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

export function maybeRecordPartnerApiMeteringFromUsage(entry: PartnerUsageEntry): void {
  if (!entry.partner?.partnerId) return;
  if (entry.success === false) return;

  const endpoint = entry.endpoint?.trim();
  if (!endpoint || endpoint.includes("/api/receipts/public")) return;

  const correlationId = resolvePartnerApiMeteringCorrelationId({
    recordId: entry.recordId,
    proofId: entry.proofId,
    endpoint,
    method: entry.method,
    apiKeyId: entry.partner.apiKeyId,
    httpStatus: entry.httpStatus,
  });

  if (!correlationId) return;

  recordPartnerMeteringEventBestEffort({
    partnerId: entry.partner.partnerId,
    eventType: PARTNER_METERING_EVENT_TYPES.partnerApiCall,
    idempotencyKey: buildPartnerApiMeteringKey({
      partnerId: entry.partner.partnerId,
      method: entry.method,
      endpoint,
      correlationId,
    }),
    policyId: entry.policyId ?? null,
    receiptId: entry.proofId ?? null,
    apiKeyId: entry.partner.apiKeyId,
    endpoint,
    method: entry.method,
  });
}
