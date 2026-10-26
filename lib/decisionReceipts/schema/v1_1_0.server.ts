// FILE: lib/decisionReceipts/schema/v1_1_0.server.ts
import "server-only";

export {
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
