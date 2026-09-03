// FILE: lib/assurance/providerAdapter.ts
// Provider integration boundary — no live vendor wiring in this module.

import type { EligibilityAssuranceLevel } from "./eligibilityAssurance";
import type { EvidenceClassification } from "./reusableCredential";

export type ProviderSessionStatus = "pending" | "completed" | "failed" | "cancelled";

export interface ProviderEvidenceRequest {
  session_id: string;
  subject_reference: string;
  requested_claim: "age_over_18" | "age_over_21";
  minimum_assurance: EligibilityAssuranceLevel;
}

export interface ProviderEvidenceResult {
  session_id: string;
  assurance_level: EligibilityAssuranceLevel;
  evidence_classification: EvidenceClassification;
  evidence_reference: string;
  completed_at: string;
}

export interface EligibilityEvidenceProviderAdapter {
  readonly provider_id: string;
  readonly supported_assurance_levels: EligibilityAssuranceLevel[];
  startEvidenceSession(request: ProviderEvidenceRequest): Promise<{ redirect_url?: string; session_id: string }>;
  pollEvidenceSession(session_id: string): Promise<{ status: ProviderSessionStatus; result?: ProviderEvidenceResult }>;
  cancelEvidenceSession(session_id: string): Promise<void>;
}
