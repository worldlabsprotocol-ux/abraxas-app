// FILE: lib/idv/buildProductEligibilityClaims.ts
// Derive non-PII product_eligibility claims from authoritative IDV DOB at issuance time.

import {
  productEligibilityClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import {
  evaluateAgeEligibilityFromDocumentDate,
  PRODUCT_ELIGIBILITY_OVER_21,
} from "@/lib/idv/ageEligibility";

export function buildProductEligibilityClaimsForIssuance(input: {
  subjectId: string;
  jti: string;
  documentDateOfBirth?: string | null;
  minimumAgeGate?: number | null;
  expiresAt: Date;
  evidenceReference?: string | null;
}): Omit<CredentialClaimRecord, "id" | "status">[] {
  const minimumAge = input.minimumAgeGate;
  if (minimumAge == null || minimumAge < 21) return [];

  const eligibility = evaluateAgeEligibilityFromDocumentDate(
    input.documentDateOfBirth,
    minimumAge,
  );
  if (!eligibility.eligible) return [];

  return [
    productEligibilityClaim({
      subjectId: input.subjectId,
      jti: input.jti,
      outcome: PRODUCT_ELIGIBILITY_OVER_21,
      expiresAt: input.expiresAt,
      evidenceReference: input.evidenceReference ?? null,
    }),
  ];
}
