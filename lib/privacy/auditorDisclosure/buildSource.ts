// FILE: lib/privacy/auditorDisclosure/buildSource.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { AuditorDisclosureMandatePayload } from "./contract";

export type AuditorDisclosureCustodyMeta = {
  custody_status: "encrypted_custody" | "purged" | "unknown";
  evidence_classification: "identity_verification" | "policy_evaluation" | "unknown";
  evidence_commitment?: { digest: string; entry_count: number } | null;
};

export function buildAuditorDisclosureSource(input: {
  record: DecisionReceiptRecord;
  mandate: AuditorDisclosureMandatePayload;
  custody: AuditorDisclosureCustodyMeta;
}): Record<string, unknown> {
  return {
    ...input.record,
    verification_decision_id: input.record.verification_decision_id,
    evidence_commitment: input.custody.evidence_commitment ?? null,
    decision_context: input.record.decision_context,
    disclosure_mandate_id: input.mandate.mandate_id,
    auditor_purpose: input.mandate.purpose,
    tenant_id: input.mandate.tenant_id,
    custody_status: input.custody.custody_status,
    evidence_classification: input.custody.evidence_classification,
    disclosure_surface: "auditor_review" as const,
    audience_hash: input.mandate.audience_hash,
  };
}