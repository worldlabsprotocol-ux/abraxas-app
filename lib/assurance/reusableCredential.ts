// FILE: lib/assurance/reusableCredential.ts
// Reusable eligibility credential model — no raw PII fields.

import type { EligibilityAssuranceLevel, EligibilityClaimType } from "./eligibilityAssurance";

export type ReusableCredentialStatus = "active" | "expired" | "revoked" | "suspended";

export type EvidenceClassification =
  | "self_attestation"
  | "age_estimation_vendor"
  | "government_id_document"
  | "government_id_with_liveness"
  | "wallet_binding"
  | "sandbox_fixture";

export interface ReusableEligibilityCredential {
  credential_id: string;
  subject_reference: string;
  issuer_id: string;
  assurance_level: EligibilityAssuranceLevel;
  claim_type: EligibilityClaimType;
  claim_value: string;
  issued_at: string;
  expires_at: string;
  evidence_classification: EvidenceClassification;
  status: ReusableCredentialStatus;
  revocation_reference: string | null;
  signature: string | null;
}

export const MERCHANT_FORBIDDEN_CREDENTIAL_FIELDS = [
  "date_of_birth",
  "dob",
  "document_number",
  "passport_image",
  "selfie",
  "legal_name",
  "address",
  "email",
  "phone",
  "id_token",
  "oauth_sub",
  "sui_address",
  "wallet_address",
] as const;

export function assertMerchantSafeCredentialView(
  payload: Record<string, unknown>,
): void {
  for (const key of Object.keys(payload)) {
    if (MERCHANT_FORBIDDEN_CREDENTIAL_FIELDS.includes(key.toLowerCase() as typeof MERCHANT_FORBIDDEN_CREDENTIAL_FIELDS[number])) {
      throw new Error(`merchant_view_contains_forbidden_field:${key}`);
    }
  }
}
