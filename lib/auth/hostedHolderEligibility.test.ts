// FILE: lib/auth/hostedHolderEligibility.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { isHostedHolderBootstrapEligible } from "./hostedHolderEligibility";

describe("isHostedHolderBootstrapEligible", () => {
  it("allows canonical Good Trouble purchase policy", () => {
    expect(isHostedHolderBootstrapEligible({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    })).toBe(true);
  });

  it("allows Good Trouble browse flow without Google-first sign-in", () => {
    expect(isHostedHolderBootstrapEligible({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(true);
  });

  it("keeps canonical Good Trouble purchase policy at L2 minimum assurance", () => {
    const pack = inferPolicyPackFromPolicyId(GOOD_TROUBLE_CANONICAL_POLICY_ID);
    expect(pack?.minimum_assurance).toBe("L2");
  });

  it("rejects unrelated partner/policy tuples", () => {
    expect(isHostedHolderBootstrapEligible({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    })).toBe(false);
  });
});
