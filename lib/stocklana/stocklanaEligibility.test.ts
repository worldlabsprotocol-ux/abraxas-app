// FILE: lib/stocklana/stocklanaEligibility.test.ts

import { describe, expect, it } from "vitest";
import {
  assertReceiptResponseHasNoPii,
  buildPartnerSafeReceiptSummary,
  resolveStocklanaEligibility,
} from "@/lib/stocklana/validateEligibilityReceipt";
import {
  STOCKLANA_ELIGIBILITY_POLICY_ID,
  STOCKLANA_PARTNER_ID,
} from "@/lib/stocklana/constants";

const baseReceipt = {
  receipt_id: "rcpt_test_001",
  partner_id: STOCKLANA_PARTNER_ID,
  policy_id: STOCKLANA_ELIGIBILITY_POLICY_ID,
  decision_result: "approved",
  reason_codes: [],
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  signature_valid: true,
  status: "active",
  decision_context: "sandbox_only",
  production_usable: false,
};

describe("Stocklana eligibility receipt validation", () => {
  it("permits a valid signed approved receipt", () => {
    const result = resolveStocklanaEligibility(baseReceipt);
    expect(result.state).toBe("permitted");
    expect(result.purchasePermitted).toBe(true);
    expect(result.partnerView?.receipt_id).toBe("rcpt_test_001");
  });

  it("denies US jurisdiction_blocked without exposing PII fields", () => {
    const result = resolveStocklanaEligibility({
      ...baseReceipt,
      decision_result: "denied",
      reason_codes: ["jurisdiction_blocked"],
    });
    expect(result.state).toBe("denied");
    expect(result.purchasePermitted).toBe(false);
    expect(result.detail).toBe("jurisdiction_blocked_us");
    const json = JSON.stringify(result.partnerView);
    expect(json).not.toMatch(/date_of_birth|street|passport_image|claim_value/i);
  });

  it("returns pending for manual_review", () => {
    const result = resolveStocklanaEligibility({
      ...baseReceipt,
      decision_result: "manual_review",
    });
    expect(result.state).toBe("pending");
    expect(result.purchasePermitted).toBe(false);
  });

  it("rejects partner mismatch fail-closed", () => {
    const result = resolveStocklanaEligibility({
      ...baseReceipt,
      partner_id: "other-partner",
    });
    expect(result.state).toBe("error");
    expect(result.detail).toBe("partner_mismatch");
  });

  it("partner-safe summary omits forbidden keys", () => {
    const summary = buildPartnerSafeReceiptSummary(baseReceipt);
    expect(summary).not.toHaveProperty("date_of_birth");
    expect(summary).not.toHaveProperty("address");
    assertReceiptResponseHasNoPii(summary as unknown as Record<string, unknown>);
  });

  it("throws when forbidden PII keys appear in payload", () => {
    expect(() =>
      assertReceiptResponseHasNoPii({ receipt_id: "x", date_of_birth: "1990-01-01" }),
    ).toThrow(/forbidden_field/);
  });
});
