// FILE: lib/partner/partnerVerificationResult.ts
// Partner-facing verification result — signed metadata only, never raw PII.

export interface PartnerVerificationResult {
  decision: "approved" | "denied" | "manual_review";
  credential_id: string;
  issuer: string;
  evaluated_at: string;
  receipt_id: string;
  receipt_expires_at: string;
  policy_id: string;
  partner_id: string;
  identity_verified: boolean;
  /** Derived eligibility — partners never receive DOB or document images. */
  over_21: boolean;
  assurance_level: string | null;
  reason_codes: string[];
}

const FORBIDDEN_KEYS = new Set([
  "passport_image",
  "selfie",
  "biometric",
  "date_of_birth",
  "address",
  "document_number",
  "legal_name",
]);

/** Strip any accidental PII keys before returning to partners. */
export function sanitizePartnerPayload<T extends Record<string, unknown>>(payload: T): T {
  const out = { ...payload };
  for (const key of Object.keys(out)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      delete out[key];
    }
  }
  return out;
}

export function buildPartnerVerificationResult(input: {
  decision: "approved" | "denied" | "manual_review";
  credentialJti: string;
  issuer: string;
  evaluatedAt: string;
  receiptId: string;
  receiptExpiresAt: string;
  policyId: string;
  partnerId: string;
  identityVerified: boolean;
  minimumAge?: number;
  assuranceLevel?: string | null;
  reasonCodes?: string[];
  productEligibilityRequired?: boolean;
  productEligibilityVerified?: boolean;
}): PartnerVerificationResult {
  return sanitizePartnerPayload({
    decision: input.decision,
    credential_id: input.credentialJti,
    issuer: input.issuer,
    evaluated_at: input.evaluatedAt,
    receipt_id: input.receiptId,
    receipt_expires_at: input.receiptExpiresAt,
    policy_id: input.policyId,
    partner_id: input.partnerId,
    identity_verified: input.identityVerified,
    over_21: input.decision === "approved"
      && input.productEligibilityRequired === true
      && input.productEligibilityVerified === true,
    assurance_level: input.assuranceLevel ?? null,
    reason_codes: input.reasonCodes ?? [],
  });
}
