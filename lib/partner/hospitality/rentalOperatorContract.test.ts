// FILE: lib/partner/hospitality/rentalOperatorContract.test.ts

import { describe, expect, it } from "vitest";
import {
  CIELO_LEGACY_MODERN_COMPONENT_MAP,
  validateRentalOperatorPolicyBinding,
} from "@/lib/partner/hospitality/rentalOperatorContract";

describe("rentalOperatorContract", () => {
  it("binds age_21_retail disclosed result", () => {
    const ok = validateRentalOperatorPolicyBinding({
      policyPackId: "age_21_retail",
      disclosedResult: "age_eligible_21",
    });
    expect(ok.ok).toBe(true);

    const bad = validateRentalOperatorPolicyBinding({
      policyPackId: "age_21_retail",
      disclosedResult: "age_eligible_18",
    });
    expect(bad.ok).toBe(false);
  });

  it("documents legacy modernization map without duplicate receipt engines", () => {
    const parallel = CIELO_LEGACY_MODERN_COMPONENT_MAP.find((r) =>
      r.component.includes("Parallel Cielo receipt"),
    );
    expect(parallel?.classification).toBe("REMOVE_ONLY_WITH_APPROVAL");
    const treasury = CIELO_LEGACY_MODERN_COMPONENT_MAP.find((r) =>
      r.component.includes("USDC booking"),
    );
    expect(treasury?.classification).toBe("RETAIN_SEPARATELY");
  });
});
