import { describe, expect, it } from "vitest";
import {
  EXPECTED_RECEIPT_ARTIFACT_TYPE,
  SANDBOX_ONLY_INVALIDATION_REASON,
  SUPPORTED_RECEIPT_SCHEMA_VERSION,
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";

const EXPECTED = {
  partnerId: "good-trouble-cannabis",
  policyId: "good-trouble-retail-v1",
};

const NOW = new Date("2026-01-01T00:00:00.000Z");

function baseReceipt(overrides: Partial<PartnerFlowPublicReceipt> = {}): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_test_fixture",
    schema_version: SUPPORTED_RECEIPT_SCHEMA_VERSION,
    partner_id: EXPECTED.partnerId,
    policy_id: EXPECTED.policyId,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    artifact_type: EXPECTED_RECEIPT_ARTIFACT_TYPE,
    evaluated_claim_refs: [{
      claim_id: "claim-1",
      claim_type: "identity_verified",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    ...overrides,
  };
}

export const SANDBOX_RECEIPT_FIXTURE: PartnerFlowPublicReceipt = baseReceipt({
  production_usable: false,
  decision_context: "sandbox_only",
  currently_valid: false,
  validity: "sandbox_only",
  invalidation_reasons: [SANDBOX_ONLY_INVALIDATION_REASON],
});

export const PRODUCTION_RECEIPT_FIXTURE: PartnerFlowPublicReceipt = baseReceipt({
  production_usable: true,
  decision_context: "production",
  currently_valid: true,
  validity: "active",
  invalidation_reasons: [],
});

function validReceipt(overrides: Record<string, unknown> = {}) {
  return baseReceipt({
    production_usable: true,
    decision_context: "production",
    currently_valid: true,
    validity: "active",
    invalidation_reasons: [],
    ...overrides,
  });
}

describe("validatePartnerFlowPublicReceipt legacy", () => {
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

  it("permits sandbox receipt only with explicit allowSandbox opt-in", () => {
    const sandboxReceipt = validReceipt({ production_usable: false, decision_context: "sandbox_only" });

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
  });
});

describe("validatePartnerFlowPublicReceipt strict sandbox mode", () => {
  it("accepts the sandbox fixture", () => {
    const result = validatePartnerFlowPublicReceipt(SANDBOX_RECEIPT_FIXTURE, {
      ...EXPECTED,
      mode: "sandbox",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects missing production_usable", () => {
    const result = validatePartnerFlowPublicReceipt(
      { ...SANDBOX_RECEIPT_FIXTURE, production_usable: undefined },
      { ...EXPECTED, mode: "sandbox", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("sandbox_production_usable_missing");
  });

  it("rejects production_usable true in sandbox mode", () => {
    const result = validatePartnerFlowPublicReceipt(
      { ...SANDBOX_RECEIPT_FIXTURE, production_usable: true },
      { ...EXPECTED, mode: "sandbox", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("sandbox_production_usable_not_false");
  });

  it("rejects wrong invalidation reason", () => {
    const result = validatePartnerFlowPublicReceipt(
      { ...SANDBOX_RECEIPT_FIXTURE, invalidation_reasons: ["production_not_usable:missing"] },
      { ...EXPECTED, mode: "sandbox", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("sandbox_invalidation_reason_mismatch");
  });

  it("rejects extra invalidation reasons", () => {
    const result = validatePartnerFlowPublicReceipt(
      {
        ...SANDBOX_RECEIPT_FIXTURE,
        invalidation_reasons: [SANDBOX_ONLY_INVALIDATION_REASON, "claim_revoked"],
      },
      { ...EXPECTED, mode: "sandbox", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("sandbox_invalidation_reason_mismatch");
  });

  it("rejects revoked claim refs", () => {
    const result = validatePartnerFlowPublicReceipt(
      {
        ...SANDBOX_RECEIPT_FIXTURE,
        evaluated_claim_refs: [{
          claim_id: "claim-1",
          claim_type: "identity_verified",
          issuer_id: "issuer:abraxas",
          status: "revoked",
          issued_at: "2026-01-01T00:00:00.000Z",
          expires_at: null,
        }],
      },
      { ...EXPECTED, mode: "sandbox", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("claim_not_active"))).toBe(true);
  });
});

describe("validatePartnerFlowPublicReceipt strict production mode", () => {
  it("accepts the production fixture", () => {
    const result = validatePartnerFlowPublicReceipt(PRODUCTION_RECEIPT_FIXTURE, {
      ...EXPECTED,
      mode: "production",
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects sandbox receipts", () => {
    const result = validatePartnerFlowPublicReceipt(SANDBOX_RECEIPT_FIXTURE, {
      ...EXPECTED,
      mode: "production",
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("production_usable_not_true");
  });

  it("rejects any invalidation reasons", () => {
    const result = validatePartnerFlowPublicReceipt(
      { ...PRODUCTION_RECEIPT_FIXTURE, invalidation_reasons: ["receipt_expired"] },
      { ...EXPECTED, mode: "production", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("production_has_invalidation_reasons");
  });

  it("rejects currently_valid false", () => {
    const result = validatePartnerFlowPublicReceipt(
      { ...PRODUCTION_RECEIPT_FIXTURE, currently_valid: false },
      { ...EXPECTED, mode: "production", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("currently_valid_not_true");
  });
});
