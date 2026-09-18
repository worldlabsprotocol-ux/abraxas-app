import { describe, expect, it, vi, beforeEach } from "vitest";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";

const getPublicReceipt = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getPublicReceipt: (...args: unknown[]) => getPublicReceipt(...args),
}));

import { gateSettlementReceipt } from "@/lib/settlement/circle/receiptGate";

function sandboxReceipt(overrides: Record<string, unknown> = {}) {
  return {
    receipt_id: "receipt-1",
    schema_version: "1.0.0",
    partner_id: "acme",
    policy_id: "policy-1",
    policy_version: 1,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    artifact_type: "eligibility_decision_receipt",
    evaluated_claim_refs: [],
    currently_valid: false,
    invalidation_reasons: ["production_not_usable:false"],
    ...overrides,
  };
}

describe("Circle settlement receipt gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a matching sandbox approved receipt", async () => {
    getPublicReceipt.mockResolvedValue(sandboxReceipt());
    const gated = await gateSettlementReceipt({
      receiptId: "receipt-1",
      partnerId: "acme",
      policyId: "policy-1",
      policyVersion: 1,
    });
    expect(gated.ok).toBe(true);
  });

  it("fails closed for unsigned, denied, expired, revoked, wrong partner, and wrong policy", async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ signature_valid: false }, CIRCLE_PUBLIC_CODES.receipt_unsigned],
      [{ decision_result: "denied" }, CIRCLE_PUBLIC_CODES.receipt_denied],
      [{ status: "expired", expires_at: "2000-01-01T00:00:00.000Z" }, CIRCLE_PUBLIC_CODES.receipt_expired],
      [{ status: "revoked" }, CIRCLE_PUBLIC_CODES.receipt_revoked],
      [{ partner_id: "other" }, CIRCLE_PUBLIC_CODES.receipt_wrong_partner],
      [{ policy_id: "other-policy" }, CIRCLE_PUBLIC_CODES.receipt_wrong_policy],
      [{ policy_version: 2 }, CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version],
    ];
    for (const [override, code] of cases) {
      getPublicReceipt.mockResolvedValue(sandboxReceipt(override));
      const gated = await gateSettlementReceipt({
        receiptId: "receipt-1",
        partnerId: "acme",
        policyId: "policy-1",
        policyVersion: 1,
      });
      expect(gated.ok).toBe(false);
      expect(gated.code).toBe(code);
    }
  });

  it("fails closed when the receipt is missing", async () => {
    getPublicReceipt.mockResolvedValue(null);
    const gated = await gateSettlementReceipt({
      receiptId: "missing",
      partnerId: "acme",
      policyId: "policy-1",
      policyVersion: 1,
    });
    expect(gated.code).toBe(CIRCLE_PUBLIC_CODES.receipt_missing);
  });
});
