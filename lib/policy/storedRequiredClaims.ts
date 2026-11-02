import type { PartnerPolicyRules, RequiredClaimRule } from "@/lib/policy/types";

/** Read the immutable published claim requirements without expanding metadata. */
export function resolveStoredRequiredClaims(rules: PartnerPolicyRules): RequiredClaimRule[] {
  return [...(rules.required_claims ?? [])];
}
