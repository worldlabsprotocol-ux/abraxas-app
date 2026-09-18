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

  it("does not enable partner handoff for browse policies (receipt redirect path)", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_BROWSE_POLICY_ID)!;
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: false,
      hasCredential: false,
      policyRules: rules,
      policyDecision: "approved",
      missingClaims: [],
    })).toBe(false);
  });

  it("requires earned credential for retail when no server evaluation is supplied", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_RETAIL_POLICY_ID)!;
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: false,
      hasCredential: false,
      policyRules: rules,
    })).toBe(false);

    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: true,
      hasCredential: true,
      policyRules: rules,
    })).toBe(true);
  });

  it("fails closed when server evaluation reports missing claims", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_RETAIL_POLICY_ID)!;
    expect(isProgressivePartnerHandoffReady({
      signedIn: true,
      walletBound: true,
      identityCredentialEarned: true,
      hasCredential: true,
      policyRules: rules,
      policyDecision: "approved",
      missingClaims: ["identity_verified"],
    })).toBe(false);
  });
});
