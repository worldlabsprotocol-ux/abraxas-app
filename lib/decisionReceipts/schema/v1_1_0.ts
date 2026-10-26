// FILE: lib/decisionReceipts/schema/v1_1_0.ts
// Isolated v1.1.0 helpers — not wired to Production issuance (Build #842).

export {
  DECISION_RECEIPT_SCHEMA_V1_0,
  DECISION_RECEIPT_SCHEMA_V1_1,
  APPLICATION_BINDING_SCOPE_SCHEMA,
  EVIDENCE_COMMITMENT_SCHEMA,
  deriveApplicationBindingRef,
  blindEvidenceRef,
  buildEvidenceCommitment,
  computeEvidenceCommitmentDigest,
  verifyEvidenceCommitment,
  verifyApplicationBindingRef,
  buildCanonicalPayloadV1_1,
  hashCanonicalPayloadV1_1,
  assertNoV11FieldsOnV10Record,
  rejectSchemaDowngrade,
} from "@abraxas/independent-verifier";

export type {
  ApplicationBindingScopeInput,
  EvidenceCommitmentEntryV1,
  EvidenceCommitmentV1,
  DecisionReceiptCanonicalPayloadV1_1,
  DecisionReceiptRecordV1_1,
} from "@abraxas/independent-verifier";
