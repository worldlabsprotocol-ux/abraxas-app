// FILE: lib/decisionReceipts/schema/v1_1_0.types.ts
// Browser-safe v1.1.0 types (aligned with @abraxas/independent-verifier).

import type { DECISION_RECEIPT_SCHEMA_V1_1, EVIDENCE_COMMITMENT_SCHEMA } from "@/lib/decisionReceipts/schema/v1_1_0.constants";

export type EvidenceDependencyType = "reusable_fact" | "source_receipt" | "derived_from";

export type EvidenceCommitmentEntryV1 = {
  dependency_type: EvidenceDependencyType;
  fact_id: string | null;
  source_credential_id: string | null;
};

export type EvidenceCommitmentV1 = {
  schema: typeof EVIDENCE_COMMITMENT_SCHEMA;
  digest: string;
  entry_count: number;
};

export type ApplicationBindingScopeInput = {
  partner_id: string;
  policy_id: string;
  policy_version: number;
  decision_context: "production" | "sandbox_only";
  launchpad_application_id: string;
};

export type DecisionReceiptCanonicalPayloadV1_1 = {
  schema_version: typeof DECISION_RECEIPT_SCHEMA_V1_1;
  application_binding_ref: string | null;
  evidence_commitment: EvidenceCommitmentV1 | null;
};
