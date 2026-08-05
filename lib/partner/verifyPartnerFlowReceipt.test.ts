import { describe, expect, it } from "vitest";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const EXPECTED = {
  partnerId: "your-partner-id",
  policyId: "your-policy-v1",
};

function validReceipt(overrides: Record<string, unknown> = {}) {
  return {
    receipt_id: "dr_test",
    partner_id: "your-partner-id",
    policy_id: "your-policy-v1",
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    ...overrides,
  };
}

describe("validatePartnerFlowPublicReceipt", () => {
  it("accepts a valid approved receipt", () => {
    const result = validatePartnerFlowPublicReceipt(validReceipt(), {
      ...EXPECTED,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid signature", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ signature_valid: false }),
      EXPECTED,
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("signature_invalid");
  });

  it("rejects expired receipt", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ expires_at: "2020-01-01T00:00:00.000Z" }),
      { ...EXPECTED, now: new Date("2026-01-01T00:00:00.000Z") },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("receipt_expired");
  });

  it("rejects wrong partner", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ partner_id: "other-partner" }),
      EXPECTED,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("partner_mismatch"))).toBe(true);
  });

  it("rejects wrong policy", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ policy_id: "other-policy-v1" }),
      EXPECTED,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("policy_mismatch"))).toBe(true);
  });

  it("rejects non-approved decision result", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ decision_result: "denied" }),
      EXPECTED,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("decision_not_approved"))).toBe(true);
  });

  it("rejects missing receipt", () => {
    const result = validatePartnerFlowPublicReceipt(null, EXPECTED);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("receipt_missing");
  });
});
