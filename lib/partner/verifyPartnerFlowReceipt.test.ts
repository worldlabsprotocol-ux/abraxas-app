import { describe, expect, it } from "vitest";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const EXPECTED = {
  partnerId: "your-partner-id",
  policyId: "your-policy-v1",
};

const NOW = new Date("2026-01-01T00:00:00.000Z");

function validReceipt(overrides: Record<string, unknown> = {}) {
  return {
    receipt_id: "dr_test",
    partner_id: "your-partner-id",
    policy_id: "your-policy-v1",
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: true,
    ...overrides,
  };
}

describe("validatePartnerFlowPublicReceipt", () => {
  it("accepts a valid approved production receipt", () => {
    const result = validatePartnerFlowPublicReceipt(validReceipt(), {
      ...EXPECTED,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid signature", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ signature_valid: false }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("signature_invalid");
  });

  it("rejects expired receipt", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ expires_at: "2020-01-01T00:00:00.000Z" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("receipt_expired");
  });

  it("rejects missing expires_at", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ expires_at: null }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("expires_at_missing");
  });

  it("rejects invalid expires_at", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ expires_at: "not-a-date" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("expires_at_invalid");
  });

  it("rejects missing status", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ status: undefined }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("status_not_active:missing");
  });

  it("rejects non-active status", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ status: "expired" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("status_not_active:expired");
  });

  it("rejects revoked receipt", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ status: "revoked" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("receipt_revoked");
    expect(result.trust?.currently_valid).toBe(false);
  });

  it("rejects production_usable=false by default", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ production_usable: false }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("production_not_usable:false");
  });

  it("rejects missing production_usable by default", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ production_usable: undefined }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("production_not_usable:missing");
  });

  it("permits sandbox receipt only with explicit allowSandbox opt-in", () => {
    const sandboxReceipt = validReceipt({ production_usable: false });

    const defaultResult = validatePartnerFlowPublicReceipt(sandboxReceipt, {
      ...EXPECTED,
      now: NOW,
    });
    expect(defaultResult.ok).toBe(false);

    const sandboxResult = validatePartnerFlowPublicReceipt(sandboxReceipt, {
      ...EXPECTED,
      now: NOW,
      allowSandbox: true,
    });
    expect(sandboxResult.ok).toBe(true);
    expect(sandboxResult.errors).toEqual([]);
  });

  it("rejects wrong partner", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ partner_id: "other-partner" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("partner_mismatch"))).toBe(true);
  });

  it("rejects wrong policy", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ policy_id: "other-policy-v1" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("policy_mismatch"))).toBe(true);
  });

  it("rejects non-approved decision result", () => {
    const result = validatePartnerFlowPublicReceipt(
      validReceipt({ decision_result: "denied" }),
      { ...EXPECTED, now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("decision_not_approved"))).toBe(true);
  });

  it("rejects missing receipt", () => {
    const result = validatePartnerFlowPublicReceipt(null, { ...EXPECTED, now: NOW });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("receipt_missing");
  });
});
