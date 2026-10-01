import { describe, expect, it } from "vitest";
import { evaluateGoodTroublePurchaseDobPrequal } from "@/lib/partner/goodTroublePurchaseDobPrequal";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";

describe("evaluateGoodTroublePurchaseDobPrequal", () => {
  const base = {
    partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
  };

  it("returns under_21 without authoritative qualification", () => {
    const result = evaluateGoodTroublePurchaseDobPrequal({
      ...base,
      dateOfBirth: "2010-01-01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.age_band).toBe("under_21");
    expect(result.valid_for_authoritative_decision).toBe(false);
  });

  it("returns over_21 prequal only — not an authoritative receipt", () => {
    const result = evaluateGoodTroublePurchaseDobPrequal({
      ...base,
      dateOfBirth: "1990-01-01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.age_band).toBe("over_21");
    expect(result.valid_for_authoritative_decision).toBe(false);
  });

  it("rejects non-canonical flows", () => {
    const result = evaluateGoodTroublePurchaseDobPrequal({
      partnerId: "other-partner",
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      dateOfBirth: "1990-01-01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("flow_not_eligible");
  });
});
