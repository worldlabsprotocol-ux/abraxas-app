import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";

describe("Good Trouble L0 holder brief", () => {
  it("uses purchase L0 copy instead of generic method chooser language", () => {
    const brief = buildHolderRequestBrief({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      environment: "production",
    });
    expect(brief.method_explanation).toContain("qualifying method");
    expect(brief.method_explanation).toContain("Verified identity");
    expect(brief.identity_not_default).toBe("");
    expect(brief.environment_label).toBe("Partner verification");
  });

  it("marks sandbox when launchpad environment is sandbox", () => {
    const brief = buildHolderRequestBrief({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      environment: "sandbox",
    });
    expect(brief.environment_label).toBe("Sandbox / test");
  });
});
