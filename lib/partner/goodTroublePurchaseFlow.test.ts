import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_PURCHASE_VERIFY_ACTION,
  isCanonicalGoodTroublePurchaseFlow,
} from "@/lib/partner/goodTroublePurchaseFlow";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";

describe("isCanonicalGoodTroublePurchaseFlow", () => {
  it("matches canonical production purchase partner and policy", () => {
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    })).toBe(true);
  });

  it("excludes browse purpose and browse policy", () => {
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "browse",
    })).toBe(false);
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
    })).toBe(false);
  });

  it("does not match legacy sandbox partner or policy ids", () => {
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    })).toBe(false);
  });

  it("exposes plain-language continue action copy without IDV escalation", () => {
    expect(GOOD_TROUBLE_PURCHASE_VERIFY_ACTION).toBe("Continue");
    expect(GOOD_TROUBLE_PURCHASE_VERIFY_ACTION).not.toContain("Verify my age");
  });
});
