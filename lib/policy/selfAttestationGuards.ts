// FILE: lib/policy/selfAttestationGuards.ts
// Self-attestation (L0) cannot satisfy regulated or authoritative requirements.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import {
  SELF_ATTESTATION_CLAIM_TYPE,
  SELF_ATTESTATION_PROVENANCE,
  type SelfAttestationPurpose,
} from "@/lib/assurance/selfAttestation/constants";
import type { PartnerPolicyRules, RequiredClaimRule } from "@/lib/policy/types";

export const REGULATED_CLAIM_TYPES_BLOCKED_FOR_SELF_ATTEST = [
  "identity_verified",
  "product_eligibility",
  "age_verified",
  "government_id_verified",
  "screening_outcome",
  "kyb_verified",
  "accredited_status",
] as const;

export function isSelfAttestationClaim(claim?: CredentialClaimRecord): boolean {
  if (!claim) return false;
  if (claim.claim_type !== SELF_ATTESTATION_CLAIM_TYPE) return false;
  const provenance = claim.claim_value?.provenance ?? claim.claim_value?.source;
  return provenance === SELF_ATTESTATION_PROVENANCE;
}

export function isBrowseAccessPolicy(rules: PartnerPolicyRules): boolean {
  return rules.browse_access_only === true;
}

export function isAgeEligibilityOnlyPolicy(rules: PartnerPolicyRules): boolean {
  return rules.age_eligibility_only === true;
}

export function isSelfAttestationEligiblePolicy(rules: PartnerPolicyRules): boolean {
  return isBrowseAccessPolicy(rules) || isAgeEligibilityOnlyPolicy(rules);
}

export function expectedSelfAttestationPurpose(rules: PartnerPolicyRules): SelfAttestationPurpose {
  if (isAgeEligibilityOnlyPolicy(rules)) return "purchase";
  return "browse";
}

export function selfAttestationForbiddenForRule(rule: RequiredClaimRule): boolean {
  const claimType = String(rule.claim_type);
  if (REGULATED_CLAIM_TYPES_BLOCKED_FOR_SELF_ATTEST.includes(
    claimType as typeof REGULATED_CLAIM_TYPES_BLOCKED_FOR_SELF_ATTEST[number],
  )) {
    return true;
  }
  if (rule.min_assurance && rule.min_assurance !== "L0") {
    return true;
  }
  return false;
}

export function selfAttestationClaimMeetsEligibilityRule(
  claim: CredentialClaimRecord,
  rule: RequiredClaimRule,
  partnerId?: string,
  policyId?: string,
  expectedPurpose: SelfAttestationPurpose = "browse",
): boolean {
  if (!isSelfAttestationClaim(claim)) return false;
  if (claim.assurance_level !== "L0") return false;

  if (partnerId && claim.claim_value?.partner_id !== partnerId) return false;
  if (policyId && claim.claim_value?.policy_id !== policyId) return false;
  if (claim.claim_value?.purpose !== expectedPurpose) return false;

  if (rule.must_equal !== undefined) {
    const outcome = claim.claim_value.outcome ?? claim.claim_value.value;
    if (String(outcome) !== String(rule.must_equal)) return false;
  }

  return true;
}

/** @deprecated Prefer selfAttestationClaimMeetsEligibilityRule with explicit purpose. */
export function selfAttestationClaimMeetsBrowseRule(
  claim: CredentialClaimRecord,
  rule: RequiredClaimRule,
  partnerId?: string,
  policyId?: string,
): boolean {
  return selfAttestationClaimMeetsEligibilityRule(claim, rule, partnerId, policyId, "browse");
}

export function assertSelfAttestationNeverAuthoritative(claimType: string): void {
  if (claimType === "product_eligibility" || claimType === "age_verified") {
    throw new Error("self_attestation_cannot_issue_authoritative_claim");
  }
}
