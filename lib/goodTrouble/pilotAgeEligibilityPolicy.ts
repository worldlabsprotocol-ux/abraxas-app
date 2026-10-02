// FILE: lib/goodTrouble/pilotAgeEligibilityPolicy.ts
// Good Trouble pilot purchase policy — L0 age eligibility without identity verification.

import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { isAgeEligibilityOnlyPolicy, isBrowseAccessPolicy } from "@/lib/policy/selfAttestationGuards";

/** Target rules for good-trouble-age_21_retail-v1 pilot (migration 122). */
export const GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES: PartnerPolicyRules = {
  age_eligibility_only: true,
  minimum_assurance_cap: "L0",
  minimum_age: 21,
  allowed_purposes: ["purchase"],
  required_claims: [
    { claim_type: "self_attested_age_band", must_equal: "over_21", max_age_hours: 24 },
  ],
  session_receipt_hours: 24,
  account_required: true,
  consent_required: true,
  sandbox_only: false,
};

export function isGoodTroublePilotAgeEligibilityPolicy(input: {
  partnerId: string;
  policyId: string;
  rules?: PartnerPolicyRules;
}): boolean {
  if (input.partnerId.trim() !== GOOD_TROUBLE_CANONICAL_PARTNER_ID) return false;
  if (input.policyId.trim() !== GOOD_TROUBLE_CANONICAL_POLICY_ID) return false;
  if (input.rules) return isAgeEligibilityOnlyPolicy(input.rules);
  return true;
}

export function policyRequiresIdentityEvidenceForPurchase(rules: PartnerPolicyRules): boolean {
  if (isAgeEligibilityOnlyPolicy(rules)) return false;
  if (isBrowseAccessPolicy(rules)) return false;
  return (rules.required_claims ?? []).some((rule) =>
    rule.claim_type === "identity_verified"
    || rule.claim_type === "liveness_passed"
    || rule.claim_type === "government_id_verified"
    || (rule.min_assurance != null && rule.min_assurance !== "L0"),
  );
}
