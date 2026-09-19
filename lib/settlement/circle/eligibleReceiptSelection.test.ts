import { describe, expect, it, beforeEach } from "vitest";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import {
  hashEligibleReceiptSelectionJti,
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
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-settlement-selection-secret";
  });

  it("rejects tampering, expiry, and cross-tenant use without an in-process replay map", async () => {
    const token = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
    });
    expect(token).toBeTruthy();
    const ok = await verifyEligibleReceiptSelection(token!, expected);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.selection.jtiHash).toMatch(/^[a-f0-9]{64}$/);
      expect(ok.selection.jtiHash).toBe(hashEligibleReceiptSelectionJti(ok.selection.jti));
      expect(ok.selection.jtiHash).not.toBe(ok.selection.jti);
    }

    const again = await verifyEligibleReceiptSelection(token!, expected);
    expect(again.ok).toBe(true);

    const tampered = await verifyEligibleReceiptSelection(`${token}x`, expected);
    expect(tampered).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_invalid });

    const expiredToken = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      ...expected,
    }, Date.now() - 11 * 60 * 1000);
    const expired = await verifyEligibleReceiptSelection(expiredToken!, expected);
    expect(expired).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_expired });

    const otherApp = await verifyEligibleReceiptSelection(
      (await signEligibleReceiptSelection({ receiptId: "receipt-1", ...expected, applicationId: "app-2" }))!,
      expected,
    );
    expect(otherApp).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant });

    const otherPartner = await verifyEligibleReceiptSelection(
      (await signEligibleReceiptSelection({ receiptId: "receipt-1", ...expected, partnerId: "other" }))!,
      expected,
    );
    expect(otherPartner).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant });

    const otherSession = await verifyEligibleReceiptSelection(
      (await signEligibleReceiptSelection({ receiptId: "receipt-1", ...expected, sessionKeyId: "key-2" }))!,
      expected,
    );
    expect(otherSession).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.selection_cross_tenant });

    const altered = await verifyEligibleReceiptSelection(
      (await signEligibleReceiptSelection({ receiptId: "receipt-1", ...expected, policyVersion: 2 }))!,
      expected,
    );
    expect(altered).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version });
  });
});
