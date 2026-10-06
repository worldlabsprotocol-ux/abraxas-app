import { describe, expect, it } from "vitest";
import { assertContinuationMatchesStored, sanitizePartnerFlowContinuation } from "@/lib/partner/partnerFlowContinuation";
import { parsePartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";

const PROD_ROW = {
  jti: "a19d68ce-10ae-40a8-bfb1-34572c41d5fe",
  partnerId: "ref-wc-postrev-5ffe",
  policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
  policyVersion: 1,
  returnUrl: "https://example.com/callback",
  purpose: "Confirm you control an eligible wallet",
  appSlug: "ref-wc-postrev-proof",
  createdAt: "2026-10-05T10:09:52.199+00",
  expiresAt: "2026-10-05T10:24:48.399+00",
  consumedAt: null,
  verifyRequestId: "vr_a0ffc47de900f0c9",
};

describe("production continuation row reuse semantics", () => {
  it("sanitizes the live production row", () => {
    expect(sanitizePartnerFlowContinuation(PROD_ROW)).not.toBeNull();
  });

  it("matches handoff binding on reuse", () => {
    expect(assertContinuationMatchesStored({
      stored: PROD_ROW,
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      returnUrl: "https://example.com/callback",
      policyVersion: 1,
    })).toEqual({ ok: true });
  });

  it("parses production expiresAt for reuse instead of treating it as expired", () => {
    const expires = parsePartnerFlowInstant(PROD_ROW.expiresAt);
    expect(expires).not.toBeNull();
    expect(expires).toBeGreaterThan(Date.parse("2026-10-05T10:09:55Z"));
  });
});
