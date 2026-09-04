// FILE: lib/partner/assuranceBoundary.ts
// Distinguishes authentication from age/eligibility evidence — never conflate them.

export type AssuranceEvidenceClass =
  | "authenticated_account"
  | "self_attested_age"
  | "reusable_authoritative_evidence"
  | "transaction_time_merchant_obligation";

export interface AssuranceBoundarySummary {
  /** Google/zkLogin/wallet binding confirms account control only. */
  authentication_is_not_age_verification: true;
  evidence_classes_required: AssuranceEvidenceClass[];
  evidence_classes_satisfied: AssuranceEvidenceClass[];
  /** Plain-language label for what the partner policy actually checks. */
  customer_requirement_label: string;
  /** Whether Abraxas can honestly claim age was verified with authoritative evidence. */
  authoritative_age_evidence_present: boolean;
}

const AUTH_ONLY_LABEL =
  "Sign in to connect your Abraxas account. Signing in does not verify your age.";

const SELF_ATTEST_LABEL =
  "Confirm the eligibility requirement in plain language. This is not the same as government ID verification.";

const AUTHORITATIVE_LABEL =
  "Complete the verification step required by this partner policy.";

const MERCHANT_OBLIGATION_NOTE =
  "In-store pickup, delivery, and point-of-sale ID checks may still be required by law.";

export function buildAssuranceBoundarySummary(input: {
  policyId: string;
  identityVerified: boolean;
  productEligibilityVerified: boolean;
  productEligibilityRequired: boolean;
  minimumAge?: number | null;
  usesSelfAttestationOnly?: boolean;
}): AssuranceBoundarySummary {
  const required: AssuranceEvidenceClass[] = ["authenticated_account"];
  const satisfied: AssuranceEvidenceClass[] = ["authenticated_account"];

  let customer_requirement_label = AUTH_ONLY_LABEL;
  let authoritative_age_evidence_present = false;

  if (input.usesSelfAttestationOnly) {
    required.push("self_attested_age");
    satisfied.push("self_attested_age");
    customer_requirement_label = SELF_ATTEST_LABEL;
  } else if (input.productEligibilityRequired || (input.minimumAge != null && input.minimumAge > 0)) {
    required.push("reusable_authoritative_evidence");
    customer_requirement_label = AUTHORITATIVE_LABEL;
    if (input.productEligibilityVerified && input.identityVerified) {
      satisfied.push("reusable_authoritative_evidence");
      authoritative_age_evidence_present = true;
    }
  } else if (input.identityVerified) {
    required.push("reusable_authoritative_evidence");
    satisfied.push("reusable_authoritative_evidence");
    authoritative_age_evidence_present = true;
    customer_requirement_label = AUTHORITATIVE_LABEL;
  } else {
    required.push("reusable_authoritative_evidence");
    customer_requirement_label = AUTHORITATIVE_LABEL;
  }

  if (input.policyId.includes("good-trouble")) {
    required.push("transaction_time_merchant_obligation");
  }

  return {
    authentication_is_not_age_verification: true,
    evidence_classes_required: required,
    evidence_classes_satisfied: satisfied,
    customer_requirement_label: `${customer_requirement_label} ${MERCHANT_OBLIGATION_NOTE}`,
    authoritative_age_evidence_present,
  };
}

/** Token, payment, or AXPROOF holdings must never affect eligibility. */
export const TOKEN_HOLDINGS_NEVER_ELIGIBILITY = true as const;
