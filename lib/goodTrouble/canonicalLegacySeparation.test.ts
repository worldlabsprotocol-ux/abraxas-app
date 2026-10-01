// FILE: lib/goodTrouble/canonicalLegacySeparation.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_FIRST_TEST,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_LEGACY_SANDBOX,
  isCanonicalGoodTroublePartnerId,
  isLegacyGoodTroublePartnerId,
} from "@/lib/goodTrouble/canonicalSandboxConfig";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";
import { resolvePreflightOptions } from "@/lib/integration/preflightConfig";

describe("Good Trouble canonical vs legacy separation", () => {
  it("keeps canonical and legacy partner ids distinct", () => {
    expect(GOOD_TROUBLE_CANONICAL_PARTNER_ID).toBe("good-trouble");
    expect(GOOD_TROUBLE_LEGACY_SANDBOX.partner_id).toBe("good-trouble-cannabis");
    expect(GOOD_TROUBLE_CANONICAL_PARTNER_ID).not.toBe(GOOD_TROUBLE_LEGACY_SANDBOX.partner_id);
    expect(isCanonicalGoodTroublePartnerId("good-trouble")).toBe(true);
    expect(isLegacyGoodTroublePartnerId("good-trouble-cannabis")).toBe(true);
    expect(isCanonicalGoodTroublePartnerId("good-trouble-cannabis")).toBe(false);
  });

  it("targets age_21_retail policy on canonical track", () => {
    expect(GOOD_TROUBLE_CANONICAL_POLICY_ID).toBe("good-trouble-age_21_retail-v1");
    expect(GOOD_TROUBLE_CANONICAL_FIRST_TEST.result_family).toBe("age_eligible_21");
    expect(GOOD_TROUBLE_RETAIL_POLICY_ID).toBe("good-trouble-retail-v1");
    expect(GOOD_TROUBLE_CANONICAL_POLICY_ID).not.toBe(GOOD_TROUBLE_RETAIL_POLICY_ID);
  });

  it("defaults integration preflight to legacy unless canonical track is selected", () => {
    expect(resolvePreflightOptions({}).partnerId).toBe(GOOD_TROUBLE_PARTNER_ID);
    const canonical = resolvePreflightOptions({
      INTEGRATION_PREFLIGHT_TRACK: "canonical",
    });
    expect(canonical.partnerId).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(canonical.policyId).toBe(GOOD_TROUBLE_CANONICAL_POLICY_ID);
  });
});
