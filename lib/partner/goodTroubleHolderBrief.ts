// FILE: lib/partner/goodTroubleHolderBrief.ts
// Holder brief overrides for Good Trouble L0 age eligibility pilot.

import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { isAgeEligibilityOnlyPolicy } from "@/lib/policy/selfAttestationGuards";
import {
  GOOD_TROUBLE_PURCHASE_CONTEXT,
  isCanonicalGoodTroublePurchaseFlow,
} from "@/lib/partner/goodTroublePurchaseFlow";
import type { HolderRequestBrief } from "@/lib/partner/holderExperience/brief";

export function isGoodTroubleAgeEligibilityPurchaseBrief(input: {
  partnerId?: string | null;
  policyId?: string | null;
  purpose?: string | null;
}): boolean {
  if (!isCanonicalGoodTroublePurchaseFlow({
    partnerId: input.partnerId ?? "",
    policyId: input.policyId ?? "",
    purpose: input.purpose,
  })) {
    return false;
  }
  const rules = findProductionPolicyRules(GOOD_TROUBLE_CANONICAL_POLICY_ID);
  return rules ? isAgeEligibilityOnlyPolicy(rules) : false;
}

export function buildGoodTroubleAgeEligibilityPurchaseBrief(input: {
  partnerName: string;
  environment?: string | null;
}): HolderRequestBrief {
  const production = input.environment === "production";
  return {
    requestor: input.partnerName,
    purpose: GOOD_TROUBLE_PURCHASE_CONTEXT,
    result: "Good Trouble receives only a yes or no 21+ result — not your birth date or identity documents.",
    shared_result_category: "21+ eligibility confirmed",
    withheld: ["date of birth", "government ID images", "legal name", "email"],
    environment_label: production ? "Partner verification" : "Sandbox / test",
    environment_detail: production
      ? "This is a production Good Trouble order eligibility check. The partner receives only the 21+ result."
      : "This is a sandbox or test request. A passing result here is not Production-usable.",
    method_explanation: "Confirm your birthday to establish 21+ eligibility. No ID or camera is required for this step.",
    google_account_only: "Sign-in opens an Abraxas account only. It is not age verification.",
    identity_not_default: "",
  };
}

export function resolveGoodTroublePurchaseEnvironmentLabel(environment?: string | null): boolean {
  return environment === "production";
}
