// FILE: lib/passport/partnerFlowHandoff.progressive.test.ts

import { describe, expect, it } from "vitest";
import { isPartnerFlowHandoffReady } from "./partnerFlowHandoff";
import { GOOD_TROUBLE_BROWSE_POLICY_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

const baseContext = {
  suiAddress: "0x1234567890abcdef1234567890abcdef12345678",
  returnPath: "https://partner.example/callback",
  partnerId: "good-trouble-cannabis",
  verificationRequestId: "vr_test",
};

describe("isPartnerFlowHandoffReady progressive wiring", () => {
  it("blocks retail handoff without earned identity credential", () => {
    expect(isPartnerFlowHandoffReady({
      ...baseContext,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      identityStatus: "not_started",
      hasCredential: false,
      walletBound: true,
    })).toBe(false);
  });

  it("allows retail handoff when identity credential is earned", () => {
    expect(isPartnerFlowHandoffReady({
      ...baseContext,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      identityStatus: "earned",
      hasCredential: true,
      walletBound: true,
    })).toBe(true);
  });

  it("does not enable browse handoff (browse uses receipt redirect)", () => {
    expect(isPartnerFlowHandoffReady({
      ...baseContext,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      identityStatus: "not_started",
      hasCredential: false,
      walletBound: true,
    })).toBe(false);
  });
});
