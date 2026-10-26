// FILE: lib/decisionReceipts/schema/v1_1_0.ts
// Browser-safe re-exports. Node crypto lives in v1_1_0.server.ts.

export {
  DECISION_RECEIPT_SCHEMA_V1_0,
  DECISION_RECEIPT_SCHEMA_V1_1,
  APPLICATION_BINDING_SCOPE_SCHEMA,
  EVIDENCE_COMMITMENT_SCHEMA,
} from "@/lib/decisionReceipts/schema/v1_1_0.constants";

export type {
  ApplicationBindingScopeInput,
  EvidenceCommitmentEntryV1,
  EvidenceCommitmentV1,
  DecisionReceiptCanonicalPayloadV1_1,
  EvidenceDependencyType,
} from "@/lib/decisionReceipts/schema/v1_1_0.types";
