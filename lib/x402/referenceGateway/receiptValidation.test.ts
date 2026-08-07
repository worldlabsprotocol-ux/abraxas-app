import { describe, expect, it, vi } from "vitest";
import { validateAbraxasEligibilityReceipt } from "./receiptValidation";

const validReceipt = {
  receipt_id: "dr_valid",
  partner_id: "pilot-partner",
  policy_id: "pilot-policy-v1",
  decision_result: "approved",
  signature_valid: true,
  status: "active",
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  production_usable: false,
};

describe("validateAbraxasEligibilityReceipt", () => {
  it("fails closed on wrong partner", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...validReceipt, partner_id: "other-partner" }),
    });

    const result = await validateAbraxasEligibilityReceipt({
      receiptId: "dr_valid",
      partnerId: "pilot-partner",
      policyId: "pilot-policy-v1",
      allowSandbox: true,
      abraxasPublicReceiptBaseUrl: "https://example.test",
      fetchFn,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("receipt_invalid");
  });

  it("accepts valid sandbox receipt for testnet demo", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validReceipt,
    });

    const result = await validateAbraxasEligibilityReceipt({
      receiptId: "dr_valid",
      partnerId: "pilot-partner",
      policyId: "pilot-policy-v1",
      allowSandbox: true,
      abraxasPublicReceiptBaseUrl: "https://example.test",
      fetchFn,
    });

    expect(result.ok).toBe(true);
  });
});
