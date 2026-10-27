import { describe, expect, it, vi, beforeEach } from "vitest";
import { receiptRequiresEvidenceDependencyGraph } from "./evidenceDependencies";

vi.mock("@/lib/passport/reusableEligibility/invalidation", () => ({
  getDerivationByDerivedReceipt: vi.fn(),
}));

describe("receiptRequiresEvidenceDependencyGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false for primary issuance receipts without derivations", async () => {
    const inv = await import("@/lib/passport/reusableEligibility/invalidation");
    vi.mocked(inv.getDerivationByDerivedReceipt).mockResolvedValue(null);
    await expect(receiptRequiresEvidenceDependencyGraph("dr_primary")).resolves.toBe(false);
  });

  it("returns true when a reuse derivation row exists", async () => {
    const inv = await import("@/lib/passport/reusableEligibility/invalidation");
    vi.mocked(inv.getDerivationByDerivedReceipt).mockResolvedValue({
      fact_id: "fact_1",
      source_receipt_id: "dr_source",
      derived_receipt_id: "dr_derived",
      requesting_partner_id: "p",
      requesting_policy_id: "pol",
    });
    await expect(receiptRequiresEvidenceDependencyGraph("dr_derived")).resolves.toBe(true);
  });

  it("propagates derivation store errors instead of assuming reuse", async () => {
    const inv = await import("@/lib/passport/reusableEligibility/invalidation");
    vi.mocked(inv.getDerivationByDerivedReceipt).mockRejectedValue(new Error("unavailable"));
    await expect(receiptRequiresEvidenceDependencyGraph("dr_any")).rejects.toThrow("unavailable");
  });
});
