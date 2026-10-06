// FILE: lib/operations/institutionalProof/contract.ts
// Canonical institutional reusable-KYC proof contract — evidence/reporting only.

export const INSTITUTIONAL_PROOF_SCHEMA_VERSION = "1.0.0" as const;
export const INSTITUTIONAL_PROOF_ARCHITECTURE_VERSION = "institutional_kyc_trust_foundation_v1" as const;
export const INSTITUTIONAL_PROOF_RECEIPT_SCHEMA_VERSION = "1.0.0" as const;

export type ProofEnvironment = "reference_test" | "sandbox" | "production";

export type ProofStageStatus = "observed" | "failed" | "unavailable" | "not_run";

export type ProofFailureCategory =
  | "provider_auth_failed"
  | "provider_event_replayed"
  | "provider_event_conflict"
  | "claim_not_authorized"
  | "assurance_insufficient"
  | "pairwise_key_unavailable"
  | "partner_binding_mismatch"
  | "application_binding_mismatch"
  | "evidence_expired"
  | "evidence_revoked"
  | "reuse_unavailable"
  | "policy_denied"
  | "receipt_invalid"
  | "internal_error";

export const INSTITUTIONAL_PROOF_STAGES = [
  "provider_evidence_authenticated",
  "subject_bound",
  "claim_normalized",
  "policy_evaluated",
  "receipt_issued",
  "application_a_verified",
  "reuse_available",
  "application_b_verified",
  "pairwise_isolation_verified",
  "revocation_received",
  "reuse_blocked_after_revocation",
] as const;

export type InstitutionalProofStage = (typeof INSTITUTIONAL_PROOF_STAGES)[number];

export interface ProofStageRecord {
  stage: InstitutionalProofStage;
  status: ProofStageStatus;
  timestamp: string | null;
  evidence_ref: string | null;
  failure_category: ProofFailureCategory | null;
}

export type ProductionConfigStatus =
  | "CODE_READY"
  | "PRODUCTION_CONFIG_REQUIRED"
  | "VERIFIED_PRESENT"
  | "UNVERIFIED";

export type ReadinessCheckValue = "verified" | "unverified" | "not_configured" | "not_applicable";

export interface ProductionReadinessSection {
  status: "verified" | "unverified";
  production_db_status: "VERIFIED" | "UNVERIFIED";
  checks: Record<string, ReadinessCheckValue>;
  config: {
    pairwise_key: ProductionConfigStatus;
    provider_ingest_secret: ProductionConfigStatus;
    provider_trust_configuration: ProductionConfigStatus;
  };
}

export interface ProofFunnelMetrics {
  provider_verifications: number;
  application_verifications: number;
  reuse_count: number;
  raw_kyc_recollections: number;
}

export interface ProofTimingMetrics {
  label: "REFERENCE_HARNESS_MEASUREMENT";
  request_to_verified_result_ms: number | null;
  provider_event_to_verified_result_ms: number | null;
  request_created_at: string | null;
  provider_event_received_at: string | null;
  claim_ready_at: string | null;
  receipt_issued_at: string | null;
  partner_verified_at: string | null;
}

export interface ProofPrivacySection {
  application_a_forbidden_field_count: number;
  application_b_forbidden_field_count: number;
  forbidden_field_count: number;
  scan_surfaces: string[];
}

export interface ProofPairwiseSection {
  application_a_pairwise_present: boolean;
  application_b_pairwise_present: boolean;
  cross_application_pairwise_distinct: boolean;
  signed_narrow_pairwise_match: boolean;
}

export interface ProofReuseSection {
  reuse_before_revocation: "reuse" | "refresh_required" | "not_compatible" | "unavailable";
  reuse_after_revocation: "reuse" | "refresh_required" | "not_compatible" | "unavailable";
  same_source_evidence_internally: boolean;
}

export interface ProofRevocationSection {
  revocation_event_authenticated: boolean;
  source_claim_status_after_revocation: "revoked" | "active" | "unknown";
  current_validity_after_revocation: "invalid" | "valid" | "unknown";
}

export interface SecurityFailureRecord {
  scenario: string;
  expected_category: ProofFailureCategory;
  observed_category: ProofFailureCategory | null;
  passed: boolean;
}

export interface OperatorBurdenSection {
  operator_touch_count: number;
  touches: string[];
}

export interface InstitutionalReusableKycEvidencePacket {
  schema_version: typeof INSTITUTIONAL_PROOF_SCHEMA_VERSION;
  generated_at: string;
  environment: ProofEnvironment;
  scenario: "institutional_reusable_kyc_reference";
  architecture_version: typeof INSTITUTIONAL_PROOF_ARCHITECTURE_VERSION;
  receipt_schema_version: typeof INSTITUTIONAL_PROOF_RECEIPT_SCHEMA_VERSION;
  readiness: ProductionReadinessSection;
  stages: ProofStageRecord[];
  funnel: ProofFunnelMetrics;
  metrics: ProofTimingMetrics;
  privacy: ProofPrivacySection;
  pairwise: ProofPairwiseSection;
  reuse: ProofReuseSection;
  revocation: ProofRevocationSection;
  security_failures: SecurityFailureRecord[];
  operator_burden: OperatorBurdenSection;
  limitations: string[];
  decision_gate: "A" | "B" | "C";
  service_graph: string[];
}

/** Fields that must never appear in partner-visible institutional proof surfaces. */
export const INSTITUTIONAL_PROOF_FORBIDDEN_FIELDS = [
  "legal_name",
  "name",
  "date_of_birth",
  "dob",
  "address",
  "passport",
  "document_number",
  "document_image",
  "selfie",
  "email",
  "phone",
  "provider_subject_ref",
  "provider_subject_ref_hash",
  "identity_subject_id",
  "claims_subject_key",
  "wallet",
  "wallet_address",
] as const;

/** Value patterns that must not appear — global pseudonym hex without pairwise prefix. */
export const INSTITUTIONAL_PROOF_FORBIDDEN_VALUE_PATTERNS = [
  /\b0x[0-9a-f]{64}\b/i,
  /\bsub_ind_[0-9a-f]+\b/i,
] as const;
