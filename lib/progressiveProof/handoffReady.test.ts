// FILE: lib/progressiveProof/handoffReady.test.ts

import { describe, expect, it } from "vitest";
import { isProgressivePartnerHandoffReady } from "./handoffReady";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";

describe("isProgressivePartnerHandoffReady", () => {
  it("preserves legacy behavior when policy rules are unknown", () => {
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: true,
      hasCredential: true,
    })).toBe(true);

    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: false,
      hasCredential: false,
    })).toBe(false);
  });

  it("does not require full IDV credential for Good Trouble browse policy", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_BROWSE_POLICY_ID)!;
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: false,
      hasCredential: false,
      policyRules: rules,
      policyDecision: "approved",
      missingClaims: [],
    })).toBe(true);
  });

  it("fails closed for browse when claims are still missing", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_BROWSE_POLICY_ID)!;
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: false,
      hasCredential: false,
      policyRules: rules,
      policyDecision: "approved",
      missingClaims: ["self_attested_age_band"],
    })).toBe(false);
  });

  it("requires eligible evaluation for retail checkout policies", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_RETAIL_POLICY_ID)!;
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: false,
      hasCredential: false,
      policyRules: rules,
      policyDecision: "approved",
      missingClaims: ["identity_verified"],
    })).toBe(false);
  });
});
