import { describe, expect, it, vi } from "vitest";
import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@abraxas/partner-kit/trust";
import { decideGoodTroubleAccess } from "@/lib/goodTrouble/accessDecision";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";

function approvedReceipt() {
  return {
    receipt_id: "dr_gt_kit",
    schema_version: "1.0.0",
    artifact_type: "eligibility_decision_receipt",
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 2,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    lifecycle_status: "active",
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
    const expired = { ...approvedReceipt(), expires_at: "2020-01-01T00:00:00.000Z", status: "expired", currently_valid: false, lifecycle_status: "expired" };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(expired), { status: 200 })) as unknown as typeof fetch;
    const expiredResult = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchFn);
    expect(expiredResult.grant).toBe(false);
    expect(expiredResult.outcome).toBe("expired");

    const revoked = { ...approvedReceipt(), status: "revoked", currently_valid: false, lifecycle_status: "revoked" };
    const fetchRevoked = vi.fn(async () => new Response(JSON.stringify(revoked), { status: 200 })) as unknown as typeof fetch;
    const revokedResult = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchRevoked);
    expect(revokedResult.grant).toBe(false);
    expect(revokedResult.outcome).toBe("revoked");
  });

  it("returns typed fail-closed outcomes for partner and signature failures", async () => {
    const wrongPartner = { ...approvedReceipt(), partner_id: "other-partner" };
    const fetchPartner = vi.fn(async () => new Response(JSON.stringify(wrongPartner), { status: 200 })) as unknown as typeof fetch;
    const partnerResult = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchPartner);
    expect(partnerResult.grant).toBe(false);
    expect(partnerResult.outcome).toBe("wrong_partner");

    const badSig = { ...approvedReceipt(), signature_valid: false };
    const fetchSig = vi.fn(async () => new Response(JSON.stringify(badSig), { status: 200 })) as unknown as typeof fetch;
    const sigResult = await decideGoodTroubleAccess(new URLSearchParams({ receipt_id: "dr_gt_kit" }), fetchSig);
    expect(sigResult.grant).toBe(false);
    expect(sigResult.outcome).toBe("invalid_signature");
  });
});
