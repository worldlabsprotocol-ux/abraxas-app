// FILE: lib/policy/resolveEffectivePolicyRules.ts
// Sandbox pilot overlay: enforce product_eligibility when minimum_age metadata implies it.

import {
  GOOD_TROUBLE_RETAIL_V2_PENDING_RULES,
} from "@/lib/policy/productionPolicyContract";
import { policyExplicitlyRequiresProductEligibility } from "@/lib/policy/evaluatePolicy";
import type { PartnerPolicy, PartnerPolicyRules } from "@/lib/policy/types";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

/**
 * Returns rules used for live policy evaluation.
 * Stored rules_json remains immutable for audit; sandbox pilots may overlay age eligibility.
 */
export function resolveEffectivePolicyRules(policy: PartnerPolicy): PartnerPolicyRules {
  const stored = policy.rules_json;

  if (policyExplicitlyRequiresProductEligibility(stored)) {
    return stored;
  }

  if (
    policy.id === GOOD_TROUBLE_RETAIL_POLICY_ID
    && stored.sandbox_only === true
    && stored.minimum_age != null
    && stored.minimum_age >= 21
  ) {
    return GOOD_TROUBLE_RETAIL_V2_PENDING_RULES;
  }

  return stored;
}
