// FILE: lib/partner/solanaNativePartnerPolicyRouting.test.ts

import { describe, expect, it } from "vitest";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import { GOOD_TROUBLE_CANONICAL_POLICY_ID } from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";
import {
  resolveEffectivePartnerPolicyId,
  solanaHolderPolicySubstitutionAllowed,
} from "@/lib/partner/solanaNativePartnerPolicyRouting";

describe("solanaNativePartnerPolicyRouting", () => {
  it("routes Cielo and Good Trouble legacy policy ids for solana holders", () => {
    expect(resolveEffectivePartnerPolicyId({
      requestedPolicyId: CIELO_VERIFIED_GUEST_POLICY_ID,
      holderMode: "solana_native",
    }).policyId).toBe(CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID);

    expect(resolveEffectivePartnerPolicyId({
      requestedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      holderMode: "solana_native",
    }).policyId).toBe(GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID);
  });

  it("does not route legacy Sui holders", () => {
    expect(resolveEffectivePartnerPolicyId({
      requestedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      holderMode: "legacy_sui",
    }).policyId).toBe(GOOD_TROUBLE_CANONICAL_POLICY_ID);
  });

  it("allows only mapped policy substitution", () => {
    expect(solanaHolderPolicySubstitutionAllowed(
      CIELO_VERIFIED_GUEST_POLICY_ID,
      CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID,
    )).toBe(true);
    expect(solanaHolderPolicySubstitutionAllowed(
      "unrelated-policy-v1",
      "other-policy-v1",
    )).toBe(false);
  });
});
