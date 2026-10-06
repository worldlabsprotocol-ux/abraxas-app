// FILE: lib/partner/valueEvidence/policyAdoption.test.ts

import { describe, expect, it } from "vitest";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";

describe("policy adoption contract", () => {
  it("counts canonical policies from registry without fabrication", () => {
    expect(POLICY_PACK_LIST.length).toBe(9);
    const productionEligible = POLICY_PACK_LIST.filter(
      (p) => p.production_suitability !== "sandbox_only",
    ).length;
    expect(productionEligible).toBeGreaterThan(0);
    expect(productionEligible).toBeLessThan(POLICY_PACK_LIST.length);
  });
});
