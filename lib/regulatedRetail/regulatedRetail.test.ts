import { describe, expect, it } from "vitest";
import { REGULATED_RETAIL_VERTICALS } from "@/lib/regulatedRetail/vertical";
import {
  GOOD_TROUBLE_RETAIL_POLICY,
  SPIRITS_RETAIL_POLICY_TEMPLATE,
  retailVerifyExample,
} from "@/lib/regulatedRetail/eligibilityPolicies";
import { GOOD_TROUBLE_BRAND } from "@/lib/goodTrouble/constants";

describe("regulated retail vertical", () => {
  it("includes cannabis and spirits verticals", () => {
    expect(REGULATED_RETAIL_VERTICALS).toHaveLength(2);
    expect(REGULATED_RETAIL_VERTICALS[0].policyId).toBe("good-trouble-retail-v1");
    expect(REGULATED_RETAIL_VERTICALS[1].policyId).toBe("spirits-retail-v1");
  });

  it("uses Good Trouble partner age gate copy for cannabis", () => {
    expect(REGULATED_RETAIL_VERTICALS[0].gateCopy).toEqual(GOOD_TROUBLE_BRAND.ageGate);
    expect(GOOD_TROUBLE_BRAND.ageGate.headline).toContain("OLD ENOUGH");
  });

  it("generates verify examples with policy ids", () => {
    const cannabis = retailVerifyExample(GOOD_TROUBLE_RETAIL_POLICY);
    expect(cannabis).toContain("good-trouble-retail-v1");
    expect(retailVerifyExample(SPIRITS_RETAIL_POLICY_TEMPLATE)).toContain("spirits-retail-v1");
  });
});
