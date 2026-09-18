import { describe, expect, it, vi } from "vitest";
import { decideGoodTroubleAccess } from "@/lib/goodTrouble/accessDecision";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

function approvedReceipt() {
  return {
    receipt_id: "dr_gt_kit",
    schema_version: "1.0.0",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: [],
    artifact_type: "eligibility_decision_receipt",
  };
}

describe("Good Trouble Integration Kit access decision", () => {
  it("permits only after server receipt verification succeeds", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(approvedReceipt()), { status: 200 })) as unknown as typeof fetch;
    const result = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchFn);
    expect(result.grant).toBe(true);
    expect(result.outcome).toBe("permitted");
  });

  it("denies expired and revoked receipts", async () => {
    const expired = { ...approvedReceipt(), expires_at: "2020-01-01T00:00:00.000Z", status: "expired", currently_valid: false };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(expired), { status: 200 })) as unknown as typeof fetch;
    const expiredResult = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchFn);
    expect(expiredResult.grant).toBe(false);
    expect(expiredResult.outcome).toBe("expired");

    const revoked = { ...approvedReceipt(), status: "revoked", currently_valid: false };
    const fetchRevoked = vi.fn(async () => new Response(JSON.stringify(revoked), { status: 200 })) as unknown as typeof fetch;
    const revokedResult = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchRevoked);
    expect(revokedResult.grant).toBe(false);
    expect(revokedResult.outcome).toBe("revoked");
  });
});
