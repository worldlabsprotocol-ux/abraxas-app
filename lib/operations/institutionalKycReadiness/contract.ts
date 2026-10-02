// FILE: lib/operations/institutionalKycReadiness/contract.ts
// Audit-only types for Utila-class institutional reusable compliance readiness.
// NOT a product module — no vendor integrations, no production policies.

export const INSTITUTIONAL_KYC_AUDIT_VERSION = "1.0.0" as const;

/** Provider-neutral normalized fact shape Abraxas could accept from an external KYC issuer. */
export interface MockExternalKycAssertion {
  provider_subject_reference: string;
  verification_status: "approved" | "denied" | "pending";
  verified_at: string;
  assurance_level: "L1" | "L2" | "L3";
  jurisdiction: string | null;
  evidence_reference: string;
  provider_event_id: string;
}

/** Raw provider payload fields that must NEVER reach relying parties. */
export const RAW_KYC_FORBIDDEN_FIELDS = [
  "legal_name",
  "date_of_birth",
  "passport_number",
  "document_image_url",
  "selfie_url",
  "address_line",
  "provider_internal_case_id",
  "risk_notes",
  "provider_payload",
] as const;

/** Conceptual composite institutional policy (NOT shipped). */
export interface ConceptualInstitutionalPolicy {
  id: string;
  required_claims: Array<{
    claim_type: string;
    min_assurance?: string;
    max_age_hours?: number;
    accepted_issuers?: string[];
  }>;
}

export type ReadinessGrade = "READY" | "PARTIALLY_READY" | "NOT_READY" | "NOT_APPROPRIATE";

export interface PrimitiveReadinessEntry {
  primitive: string;
  grade: ReadinessGrade;
  evidence: string;
  gap?: string;
}
