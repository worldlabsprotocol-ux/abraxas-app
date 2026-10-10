// FILE: lib/cielo/cieloReceiptTrust.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const getPartnerReceiptMock = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getPartnerReceipt: (...args: unknown[]) => getPartnerReceiptMock(...args),
}));

import { assertCieloDecisionReceiptCurrentlyValid } from "@/lib/cielo/cieloReceiptTrust";

describe("assertCieloDecisionReceiptCurrentlyValid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects wrong partner audience", async () => {
    getPartnerReceiptMock.mockResolvedValue({ error: "forbidden" });
    await expect(
      assertCieloDecisionReceiptCurrentlyValid({
        receiptId: "dr_x",
        decisionId: "dec_x",
        consentReceiptId: "con_x",
      }),
    ).rejects.toThrow(/not found|wrong partner/i);
  });

  it("rejects invalid receipt trust", async () => {
    getPartnerReceiptMock.mockResolvedValue({
      valid: false,
      currently_valid: false,
      invalidation_reasons: ["receipt_expired"],
      view: { policy_id: "cielo-verified-guest-v1" },
    });
    await expect(
      assertCieloDecisionReceiptCurrentlyValid({
        receiptId: "dr_x",
        decisionId: "dec_x",
        consentReceiptId: "con_x",
      }),
    ).rejects.toThrow(/not currently valid/i);
  });

  it("passes when partner receipt is currently valid", async () => {
    getPartnerReceiptMock.mockResolvedValue({
      valid: true,
      currently_valid: true,
      view: {
        policy_id: "cielo-verified-guest-v1",
        decision_id: "dec_x",
        consent_receipt_id: "con_x",
      },
    });
    await expect(
      assertCieloDecisionReceiptCurrentlyValid({
        receiptId: "dr_x",
        decisionId: "dec_x",
        consentReceiptId: "con_x",
      }),
    ).resolves.toBeUndefined();
  });
});
