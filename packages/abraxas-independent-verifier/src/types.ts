import type { EvidenceCommitmentEntryV1, EvidenceCommitmentV1 } from "./v1_1_0/evidenceCommitment";

export const TRUST_ANCHOR_BUNDLE_DOCUMENT = "abraxas_trust_anchor_bundle" as const;
export const TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;

export const ISSUER_AUTHORITY_STATEMENT_DOCUMENT = "abraxas_issuer_authority_statement" as const;
export const ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION = "1.0.0" as const;

export const RECEIPT_STATUS_EVIDENCE_DOCUMENT = "abraxas_receipt_status_evidence" as const;
export const RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION = "1.0.0" as const;

export type TrustAnchorBundleV1 = {
  document: typeof TRUST_ANCHOR_BUNDLE_DOCUMENT;
  schema_version: typeof TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION;
  anchor_key_id: string;
  public_jwk: JsonWebKey;
  /** SHA-256 hex of canonical public key material — must match computed fingerprint. */
  public_key_fingerprint: string;
  environment: "demo" | "production";
  effective_from: string;
  /** Integrator must obtain this document out-of-band; HTTPS fetch of SIAS does not establish the anchor. */
  distribution: "out_of_band" | "pinned_by_integrator";
  statement_cache_max_age_seconds: number;
  /** Max age for signed status statements (issued_at → verifier now). */
  status_statement_max_age_seconds: number;
  minimum_registry_version_hint: number | null;
};

export type IssuerAuthorityKeyEntry = {
  key_id: string;
  environment: "demo" | "production";
  status: "active" | "retiring" | "retired" | "revoked";
  not_before: string;
  expires_at: string | null;
  public_jwk: JsonWebKey;
  schema_versions: string[];
  allow_historical_verification: boolean;
  historical_verify_until: string | null;
  reason_class: string;
};

export type StatusSignerKeyEntry = {
  key_id: string;
  environment: "demo" | "production";
  status: "active" | "revoked";
  not_before: string;
  expires_at: string | null;
  public_jwk: JsonWebKey;
  reason_class: string;
};

export type IssuerAuthorityStatementPayload = {
  document: typeof ISSUER_AUTHORITY_STATEMENT_DOCUMENT;
  schema_version: typeof ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION;
  registry_version: number;
  supersedes_registry_version: number | null;
  environment: "demo" | "production";
  issued_at: string;
  not_before: string;
  anchor_key_id: string;
  keys: IssuerAuthorityKeyEntry[];
  /** Authorized Ed25519 keys for signed receipt status statements (independent of HTTP status APIs). */
  status_signers?: StatusSignerKeyEntry[];
};

export const RECEIPT_STATUS_STATEMENT_DOCUMENT = "abraxas_signed_receipt_status_statement" as const;
export const RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION = "1.0.0" as const;

export type ReceiptStatusStatementPayload = {
  document: typeof RECEIPT_STATUS_STATEMENT_DOCUMENT;
  schema_version: typeof RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION;
  receipt_id: string;
  /** Privacy-preserving status reference (receipt id only — no holder identifiers). */
  status_reference: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  environment: "demo" | "production";
  status_version: number;
  supersedes_status_version: number | null;
  receipt_status: "active" | "revoked" | "expired";
  superseded: boolean;
  partner_operational: boolean;
  policy_active: boolean;
  claims_current: boolean;
  evidence_current: boolean;
  effective_at: string;
  issued_at: string;
  statement_expires_at: string;
  status_signer_key_id: string;
};

export type SignedReceiptStatusStatement = {
  payload: ReceiptStatusStatementPayload;
  payload_hash: string;
  signature: string;
  status_signer_key_id: string;
};

export type SignedIssuerAuthorityStatement = {
  payload: IssuerAuthorityStatementPayload;
  payload_hash: string;
  signature: string;
  anchor_key_id: string;
};

export type EvaluatedClaimRef = {
  claim_id: string;
  claim_type: string;
  issuer_id?: string;
  status?: string;
  issued_at?: string;
  expires_at?: string | null;
};

export type DecisionReceiptRecord = {
  id: string;
  verification_decision_id: string;
  consent_receipt_id: string | null;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  subject_pseudonym_id: string;
  wallet_binding_ref: string | null;
  decision_result: "approved" | "denied" | "manual_review";
  reason_codes: string[];
  evaluated_claim_refs: EvaluatedClaimRef[];
  issuer_refs: string[];
  decision_context: "production" | "sandbox_only";
  evaluated_at: string;
  expires_at: string | null;
  revoked_at?: string | null;
  status: "active" | "expired" | "revoked";
  schema_version: string;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  application_binding_ref?: string | null;
  evidence_commitment?: EvidenceCommitmentV1 | null;
};

export type ReceiptStatusEvidenceV1 = {
  document: typeof RECEIPT_STATUS_EVIDENCE_DOCUMENT;
  schema_version: typeof RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION;
  receipt_id: string;
  observed_at: string;
  receipt_status: "active" | "revoked" | "expired";
  superseded: boolean;
  partner_operational: boolean;
  policy_active: boolean;
  claims_current: boolean;
  evidence_current: boolean;
};

export type RelyingPartyExpectations = {
  partner_id: string;
  policy_id: string;
  environment: "demo" | "production";
  /** v1.1.0 — when set, receipt must carry the same opaque application_binding_ref. */
  application_binding_ref?: string;
  /** v1.1.0 — manifest used to recompute evidence_commitment.digest (not proof of current validity). */
  evidence_commitment_manifest?: EvidenceCommitmentEntryV1[];
};
