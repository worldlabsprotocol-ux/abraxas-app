// FILE: lib/demo/relyingPartyPilot/relyingPartyPilot.test.ts

import { describe, expect, it } from "vitest";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  buildReceiptInspectorFields,
  pilotPayloadLeaks,
  resolveRelyingPartyPilotConfig,
  resolveRelyingPartyPilotMerchant,
  RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS,
  verifyPilotPartnerReceipt,
} from "@/lib/demo/relyingPartyPilot";

function receipt(input: {
  partner_id: string;
  policy_id: string;
  receipt_id: string;
  kind?: "approved" | "denied" | "expired" | "revoked";
}): PartnerFlowPublicReceipt {
  const kind = input.kind ?? "approved";
  return {
    receipt_id: input.receipt_id,
    schema_version: "1.0.0",
    partner_id: input.partner_id,
    policy_id: input.policy_id,
    policy_version: 1,
    decision_result: kind === "denied" ? "denied" : "approved",
    signature_valid: true,
    expires_at: kind === "expired" ? "2020-01-01T00:00:00.000Z" : "2099-01-01T00:00:00.000Z",
    status: kind === "revoked" ? "revoked" : kind === "expired" ? "expired" : "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: kind === "approved",
    invalidation_reasons: kind === "approved" ? [] : ["invalid"],
    artifact_type: "eligibility_decision_receipt",
  };
}

describe("relying party pilot", () => {
  it("resolves age_21_retail merchant slots with distinct callback URLs", () => {
    const config = resolveRelyingPartyPilotConfig({
      RELYING_PARTY_PILOT_PARTNER_A_ID: "merchant-a",
      RELYING_PARTY_PILOT_PARTNER_A_POLICY_ID: "merchant-a-age_21_retail-v1",
      RELYING_PARTY_PILOT_PARTNER_B_ID: "merchant-b",
      RELYING_PARTY_PILOT_PARTNER_B_POLICY_ID: "merchant-b-age_21_retail-v1",
    }, "https://abraxasworld.xyz");

    expect(config.pack_id).toBe("age_21_retail");
    expect(config.merchants.a.partner_id).toBe("merchant-a");
    expect(config.merchants.b.partner_id).toBe("merchant-b");
    expect(config.merchants.a.callback_url).toContain("slot=a");
    expect(config.merchants.b.callback_url).toContain("slot=b");
    expect(config.merchants.a.verify_url).toContain("merchant-a-age_21_retail-v1");
  });

  it("builds holder disclosure brief without DOB in shared fields", () => {
    const pack = POLICY_PACKS.age_21_retail;
    const merchant = resolveRelyingPartyPilotMerchant("a", {
      RELYING_PARTY_PILOT_PARTNER_A_ID: "demo-merchant",
      RELYING_PARTY_PILOT_PARTNER_A_POLICY_ID: buildLaunchpadPolicyId("demo-merchant", "age_21_retail"),
      RELYING_PARTY_PILOT_PARTNER_A_NAME: "Demo Merchant",
    });
    const brief = buildHolderRequestBrief({
      partnerId: merchant.partner_id,
      partnerName: merchant.display_name,
      policyId: merchant.policy_id,
      purpose: merchant.purpose,
      environment: "sandbox",
      disclosedResult: pack.disclosed_result,
      userExplanation: pack.holder_explanation,
    });
    expect(brief.shared_result_category).toContain("age_eligible_21");
    expect(brief.withheld.join(" ").toLowerCase()).toContain("date of birth");
    expect(JSON.stringify(brief).toLowerCase()).not.toContain("1990-01-01");
  });

  it("verifies approved receipts and denies cross-partner, expired, and revoked receipts", async () => {
    const merchantA = resolveRelyingPartyPilotMerchant("a", {
      RELYING_PARTY_PILOT_PARTNER_A_ID: "merchant-a",
      RELYING_PARTY_PILOT_PARTNER_A_POLICY_ID: "merchant-a-age_21_retail-v1",
    });
    const store = new Map<string, PartnerFlowPublicReceipt>([
      ["dr_a", receipt({ partner_id: "merchant-a", policy_id: "merchant-a-age_21_retail-v1", receipt_id: "dr_a" })],
      ["dr_b", receipt({ partner_id: "merchant-b", policy_id: "merchant-b-age_21_retail-v1", receipt_id: "dr_b" })],
      ["dr_exp", receipt({ partner_id: "merchant-a", policy_id: "merchant-a-age_21_retail-v1", receipt_id: "dr_exp", kind: "expired" })],
      ["dr_rev", receipt({ partner_id: "merchant-a", policy_id: "merchant-a-age_21_retail-v1", receipt_id: "dr_rev", kind: "revoked" })],
    ]);
    const fetchFn = (async (url: string) => {
      const id = decodeURIComponent(String(url).split("/").slice(-2, -1)[0] ?? "");
      const found = store.get(id);
      if (!found) return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
      return new Response(JSON.stringify(found), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    const ok = await verifyPilotPartnerReceipt({ merchant: merchantA, receipt_id: "dr_a", fetchFn });
    expect(ok.allowed).toBe(true);
    expect(ok.partner_visible?.result).toBe("age_eligible_21");
    expect(pilotPayloadLeaks(ok.partner_visible)).toEqual([]);

    const cross = await verifyPilotPartnerReceipt({ merchant: merchantA, receipt_id: "dr_b", fetchFn });
    expect(cross.allowed).toBe(false);

    const expired = await verifyPilotPartnerReceipt({ merchant: merchantA, receipt_id: "dr_exp", fetchFn });
    expect(expired.allowed).toBe(false);

    const revoked = await verifyPilotPartnerReceipt({ merchant: merchantA, receipt_id: "dr_rev", fetchFn });
    expect(revoked.allowed).toBe(false);
  });

  it("does not treat tampered callback params as authorization without a valid receipt", async () => {
    const merchant = resolveRelyingPartyPilotMerchant("a", {
      RELYING_PARTY_PILOT_PARTNER_A_ID: "merchant-a",
      RELYING_PARTY_PILOT_PARTNER_A_POLICY_ID: "merchant-a-age_21_retail-v1",
    });
    const fetchFn = (async () => new Response(JSON.stringify({ error: "missing" }), { status: 404 })) as typeof fetch;
    const result = await verifyPilotPartnerReceipt({
      merchant,
      search_params: { receipt_id: "dr_missing", decision: "approved", status: "approved" },
      fetchFn,
    });
    expect(result.allowed).toBe(false);
  });

  it("builds receipt inspector fields without forbidden partner data classes", () => {
    const merchant = resolveRelyingPartyPilotMerchant("a");
    const verification = {
      allowed: true,
      outcome: "permitted",
      reason_codes: [],
      checks: [],
      receipt: receipt({
        partner_id: merchant.partner_id,
        policy_id: merchant.policy_id,
        receipt_id: "dr_demo",
      }),
      partner_visible: {
        result: "age_eligible_21",
        policy: merchant.policy_id,
        policy_version: 1,
        partner_id: merchant.partner_id,
        receipt_id: "dr_demo",
        expires_at: "2099-01-01T00:00:00.000Z",
        currently_valid: true,
        signature_valid: true,
        status: "active",
      },
      cryptographically_verified: true,
    };
    const fields = buildReceiptInspectorFields({
      verification,
      partner_name: merchant.display_name,
      purpose: merchant.purpose,
    });
    const blob = JSON.stringify(fields).toLowerCase();
    for (const forbidden of RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS) {
      expect(blob.includes(forbidden.toLowerCase())).toBe(false);
    }
    expect(fields.some((field) => field.value.includes("Cryptographically verified"))).toBe(true);
  });
});
