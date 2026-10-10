// FILE: lib/cielo/cieloVerifiedGuestPolicyContract.test.ts

import { describe, expect, it } from "vitest";
import {
  cieloPolicyEquivalentToAge21Retail,
  cieloVerifiedGuestV1Predicates,
  age21RetailPackPredicates,
  CIELO_V1_DISCLOSED_RESULT,
} from "@/lib/cielo/cieloVerifiedGuestPolicyContract";

describe("Cielo policy predicate audit", () => {
  it("proves cielo-verified-guest-v1 is not equivalent to age_21_retail", () => {
    expect(cieloPolicyEquivalentToAge21Retail()).toBe(false);
    const cielo = cieloVerifiedGuestV1Predicates();
    const age21 = age21RetailPackPredicates();
    expect(cielo.minimum_age).toBeNull();
    expect(age21.minimum_age).toBe(21);
    expect(cielo.disclosed_result).toBe(CIELO_V1_DISCLOSED_RESULT);
    expect(age21.disclosed_result).toBe("age_eligible_21");
    expect(cielo.required_claim_types).toContain("wallet_binding_confirmed");
    expect(age21.required_claim_types).toContain("identity_verified");
  });
});
