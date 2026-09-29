// FILE: lib/demo/relyingPartyPilot/secondPartner.test.ts

import { describe, expect, it } from "vitest";
import { derivedClaimRefs, derivedReceiptLeaksSource } from "@/lib/passport/reusableEligibility/issue";
import { projectInternalFact, type SourceReceiptRow } from "@/lib/passport/reusableEligibility/facts";
import { evaluateFactCompatibility } from "@/lib/passport/reusableEligibility/compatibility";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { verifyPilotPartnerReceipt } from "@/lib/demo/relyingPartyPilot/verification";

const SUBJECT = "0x" + "c".repeat(64);

function sourceReceipt(partnerId: string, receiptId: string): SourceReceiptRow {
  return {
    id: receiptId,
    verification_decision_id: "00000000-0000-4000-8000-000000000001",
    partner_id: partnerId,
    policy_id: `${partnerId}-age_21_retail-v1`,
    policy_version: 1,
    subject_pseudonym_id: SUBJECT,
    decision_result: "approved",
    decision_context: "sandbox_only",
    evaluated_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    revoked_at: null,
    status: "active",
  };
}

function publicReceipt(partnerId: string, receiptId: string): PartnerFlowPublicReceipt {
  return {
    receipt_id: receiptId,
    schema_version: "1.0.0",
    partner_id: partnerId,
    policy_id: `${partnerId}-age_21_retail-v1`,
    policy_version: 1,
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

describe("second relying partner pilot", () => {
  it("supports Partner B from existing age evidence without transferring Partner A receipt", () => {
    const fact = projectInternalFact({
      subjectId: SUBJECT,
      receipt: sourceReceipt("merchant-a", "dr_partner_a"),
    })!;
    const compatible = evaluateFactCompatibility({
      fact,
      targetPolicyId: "merchant-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: true,
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(compatible.ok).toBe(true);

    const derivedRefs = derivedClaimRefs(fact, "merchant-b-age_21_retail-v1");
    const derivedPublic = {
      partner_id: "merchant-b",
      policy_id: "merchant-b-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      status: "active",
      reason_codes: ["all_claims_met"],
      evaluated_claim_refs: derivedRefs,
    };
    expect(derivedReceiptLeaksSource(derivedPublic, fact)).toBe(false);
    expect(JSON.stringify(derivedPublic)).not.toContain("dr_partner_a");
    expect(JSON.stringify(derivedPublic).toLowerCase()).not.toContain("date_of_birth");
  });

  it("keeps receipt A and receipt B distinct and rejects cross-partner verification", async () => {
    const receiptA = publicReceipt("merchant-a", "dr_partner_a");
    const receiptB = publicReceipt("merchant-b", "dr_partner_b");
    expect(receiptA.receipt_id).not.toBe(receiptB.receipt_id);

    const store = new Map([
      [receiptA.receipt_id!, receiptA],
      [receiptB.receipt_id!, receiptB],
    ]);
    const fetchFn = (async (url: string) => {
      const id = decodeURIComponent(String(url).split("/").slice(-2, -1)[0] ?? "");
      const found = store.get(id);
      if (!found) return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
      return new Response(JSON.stringify(found), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    const merchantA = {
      partner_id: "merchant-a",
      policy_id: "merchant-a-age_21_retail-v1",
      policy_version: 1,
    };
    const merchantB = {
      partner_id: "merchant-b",
      policy_id: "merchant-b-age_21_retail-v1",
      policy_version: 1,
    };

    const aOwn = await verifyPilotPartnerReceipt({ merchant: merchantA, receipt_id: "dr_partner_a", fetchFn });
    const bOwn = await verifyPilotPartnerReceipt({ merchant: merchantB, receipt_id: "dr_partner_b", fetchFn });
    expect(aOwn.allowed).toBe(true);
    expect(bOwn.allowed).toBe(true);

    const bUsingA = await verifyPilotPartnerReceipt({ merchant: merchantB, receipt_id: "dr_partner_a", fetchFn });
    expect(bUsingA.allowed).toBe(false);
  });
});
