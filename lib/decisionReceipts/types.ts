// FILE: lib/decisionReceipts/types.ts
// Decision Receipt v1 — eligibility / policy evaluation receipt types.

export const DECISION_RECEIPT_SCHEMA_VERSION = "1.0.0";

export type DecisionReceiptStatus = "active" | "expired" | "revoked";
export type DecisionReceiptContext = "production" | "sandbox_only";
export type DecisionReceiptResult = "approved" | "denied" | "manual_review";

/** Claim reference only — no raw claim_value or PII */
export interface EvaluatedClaimRef {
  claim_id: string;
  claim_type: string;
  issuer_id: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
}

/** Signed canonical payload — deterministic across re-serialization */
export interface DecisionReceiptCanonicalPayload {
  receipt_id: string;
  schema_version: string;
  decision_id: string;
  policy_id: string;
  policy_version: number;
  partner_id: string;
  subject_pseudonym_id: string;
  wallet_binding_ref: string | null;
  consent_receipt_id: string | null;
  decision_result: DecisionReceiptResult;
  reason_codes: string[];
  evaluated_claim_refs: EvaluatedClaimRef[];
  issuer_refs: string[];
  decision_context: DecisionReceiptContext;
  evaluated_at: string;
  expires_at: string | null;
}

export interface DecisionReceiptRecord {
  id: string;
  verification_decision_id: string;
  consent_receipt_id: string | null;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  subject_pseudonym_id: string;
  wallet_binding_ref: string | null;
  decision_result: DecisionReceiptResult;
  reason_codes: string[];
  evaluated_claim_refs: EvaluatedClaimRef[];
  issuer_refs: string[];
  decision_context: DecisionReceiptContext;
  evaluated_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  status: DecisionReceiptStatus;
  schema_version: string;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  anchor_reference: string | null;
  idempotency_key: string | null;
  created_at: string;
}

/** Public-safe view — no PII, no raw claim values */
export interface DecisionReceiptPublicView {
  receipt_id: string;
  schema_version: string;
  policy_id: string;
  policy_version: number;
  partner_id: string;
  subject_pseudonym_id: string;
  decision_result: DecisionReceiptResult;
  reason_codes: string[];
  evaluated_claim_refs: EvaluatedClaimRef[];
  issuer_refs: string[];
  decision_context: DecisionReceiptContext;
  production_usable: boolean;
  evaluated_at: string;
  expires_at: string | null;
  status: DecisionReceiptStatus;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  signature_valid: boolean;
  anchor_reference: string | null;
  artifact_type: "eligibility_decision_receipt";
  /** Additive live trust — server-computed at fetch time; partners must re-fetch per access decision. */
  currently_valid?: boolean;
  validity?: string;
  invalidation_reasons?: string[];
}

/** Partner view — full permitted receipt when consent scope allows */
export interface DecisionReceiptPartnerView extends DecisionReceiptPublicView {
  decision_id: string;
  consent_receipt_id: string | null;
  wallet_binding_ref: string | null;
  consent_scope_allowed: boolean;
}

export interface IssueDecisionReceiptInput {
  verificationDecisionId: string;
  consentReceiptId?: string | null;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  subjectId: string;
  decisionResult: DecisionReceiptResult;
  reasonCodes: string[];
  evaluatedClaimRefs: EvaluatedClaimRef[];
  evaluatedAt?: string;
  expiresAt?: string | null;
  decisionContext?: DecisionReceiptContext;
  idempotencyKey?: string;
  anchorReference?: string | null;
}
