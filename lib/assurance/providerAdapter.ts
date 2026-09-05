// FILE: lib/assurance/providerAdapter.ts
// Provider-neutral evidence adapter — swap vendors without rewriting policy evaluation.

import type { EligibilityAssuranceLevel } from "./eligibilityAssurance";
import type { EvidenceClassification } from "./reusableCredential";

export type ProviderSessionStatus = "pending" | "completed" | "failed" | "cancelled";

/** Example cross-industry evidence claim targets — policy selects required claims. */
export type ProviderEvidenceClaimTarget =
  | "age_over_18"
  | "age_over_21"
  | "identity_verified"
  | "residency"
  | "jurisdiction"
  | "accredited_investor"
  | "business_verified"
  | "professional_license"
  | "student_status"
  | "sanctions_screened";

export interface ProviderEvidenceRequest {
  session_id: string;
  subject_reference: string;
  requested_claim: ProviderEvidenceClaimTarget;
  minimum_assurance: EligibilityAssuranceLevel;
  purpose: string;
  jurisdiction?: string;
}

export interface ProviderEvidenceResult {
  session_id: string;
  assurance_level: EligibilityAssuranceLevel;
  evidence_classification: EvidenceClassification;
  evidence_reference: string;
  completed_at: string;
  /** Claim outcome for policy engine — never raw PII. */
  claim_outcome: string;
}

export interface EligibilityEvidenceProviderAdapter {
  readonly provider_id: string;
  readonly supported_claims: ProviderEvidenceClaimTarget[];
  readonly supported_assurance_levels: EligibilityAssuranceLevel[];
  startEvidenceSession(request: ProviderEvidenceRequest): Promise<{ redirect_url?: string; session_id: string }>;
  pollEvidenceSession(session_id: string): Promise<{ status: ProviderSessionStatus; result?: ProviderEvidenceResult }>;
  cancelEvidenceSession(session_id: string): Promise<void>;
}
