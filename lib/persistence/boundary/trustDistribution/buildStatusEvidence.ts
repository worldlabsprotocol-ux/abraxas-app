// FILE: lib/persistence/boundary/trustDistribution/buildStatusEvidence.ts

import {
  RECEIPT_STATUS_EVIDENCE_DOCUMENT,
  RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION,
  type ReceiptStatusEvidenceV1,
} from "@abraxas/independent-verifier";
import type { SovereignCurrentValidityResult } from "../sovereignCurrentValidity/evaluate";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";

/** Maps sovereign PG evaluation into RP-supplied status evidence (integrator must authenticate observation). */
export function buildReceiptStatusEvidenceFromSovereignEvaluation(input: {
  record: DecisionReceiptRecord;
  evaluation: SovereignCurrentValidityResult;
  observedAt?: string;
}): ReceiptStatusEvidenceV1 {
  const stored = resolveReceiptStatus(input.record);
  return {
    document: RECEIPT_STATUS_EVIDENCE_DOCUMENT,
    schema_version: RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION,
    receipt_id: input.record.id,
    observed_at: input.observedAt ?? input.evaluation.checked_at,
    receipt_status: stored === "revoked" ? "revoked" : stored === "expired" ? "expired" : "active",
    superseded: input.evaluation.superseded,
    partner_operational: !input.evaluation.invalidation_reasons.includes("partner_inactive"),
    policy_active: !input.evaluation.invalidation_reasons.includes("policy_no_longer_valid"),
    claims_current: input.evaluation.claims_current,
    evidence_current: input.evaluation.evidence_current,
  };
}
