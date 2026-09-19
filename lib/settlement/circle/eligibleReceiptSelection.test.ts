import { describe, expect, it, beforeEach } from "vitest";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import {
  consumeEligibleReceiptSelection,
  resetEligibleReceiptSelectionReplayForTests,
  signEligibleReceiptSelection,
  verifyEligibleReceiptSelection,
} from "@/lib/settlement/circle/eligibleReceiptSelection";

const expected = {
  partnerId: "acme",
  applicationId: "app-1",
  policyId: "policy-1",
  policyVersion: 1,
  sessionKeyId: "key-1",
};

describe("eligible receipt selection tokens", () => {
  beforeEach(() => {
    resetEligibleReceiptSelectionReplayForTests();
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-settlement-selection-secret";
  });

  it("rejects tampering, expiry, replay, and cross-tenant use", async () => {
    const token = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
    });
    expect(token).toBeTruthy();
    const ok = await verifyEligibleReceiptSelection(token!, expected);
    expect(ok.ok).toBe(true);

    const tampered = await verifyEligibleReceiptSelection(`${token}x`, expected);
    expect(tampered).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_invalid });

    const expiredToken = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
    }, Date.now() - 11 * 60 * 1000);
    const expired = await verifyEligibleReceiptSelection(expiredToken!, expected);
    expect(expired).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_expired });

    const otherApp = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
      applicationId: "app-2",
    });
    const crossApp = await verifyEligibleReceiptSelection(otherApp!, expected);
    expect(crossApp).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant });

    const otherPartner = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
      partnerId: "other",
    });
    const crossPartner = await verifyEligibleReceiptSelection(otherPartner!, expected);
    expect(crossPartner).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant });

    const otherSession = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
      sessionKeyId: "key-2",
    });
    const crossSession = await verifyEligibleReceiptSelection(otherSession!, expected);
    expect(crossSession).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant });

    const wrongPolicy = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
      policyVersion: 2,
    });
    const altered = await verifyEligibleReceiptSelection(wrongPolicy!, expected);
    expect(altered).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version });

    if (ok.ok) consumeEligibleReceiptSelection(ok.selection.jti, ok.selection.expMs);
    const replay = await verifyEligibleReceiptSelection(token!, expected);
    expect(replay).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_replay });
  });
});
