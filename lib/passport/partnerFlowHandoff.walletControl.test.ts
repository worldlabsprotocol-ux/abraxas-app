import { describe, expect, it } from "vitest";
import { isPartnerFlowHandoffReady } from "./partnerFlowHandoff";

describe("isPartnerFlowHandoffReady wallet_control", () => {
  const base = {
    returnPath: "https://example.com/callback",
    partnerId: "ref-wc-postrev-5ffe",
    policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
    verifyRequestRef: "vr_test",
    identityStatus: "not_started",
    hasCredential: false,
    walletBound: true,
  };

  it("requires method qualification, not identity credential", () => {
    expect(isPartnerFlowHandoffReady({
      ...base,
      suiAddress: null,
      sessionSubject: "abx_hs_0123456789abcdef0123456789abcdef",
      methodQualified: false,
    })).toBe(false);

    expect(isPartnerFlowHandoffReady({
      ...base,
      suiAddress: null,
      sessionSubject: "abx_hs_0123456789abcdef0123456789abcdef",
      methodQualified: true,
    })).toBe(true);
  });
});
