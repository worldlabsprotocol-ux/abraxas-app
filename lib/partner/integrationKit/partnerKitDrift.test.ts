import { describe, expect, it } from "vitest";
import { evaluatePublicReceiptTrust as packageEvaluatePublicReceiptTrust } from "@abraxas/partner-kit/trust";
import { evaluatePublicReceiptTrust as appEvaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { INTEGRATION_POLICY_PACKS } from "@abraxas/partner-kit";
import { POLICY_PACK_LIST, resolvePolicyPack as appResolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";

describe("partner-kit trust drift guard", () => {
  it("evaluatePublicReceiptTrust matches app wrapper for sandbox receipt fixture", () => {
    const receipt = {
      receipt_id: "dr_drift",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: false,
      currently_valid: false,
      invalidation_reasons: ["sandbox_only_not_production_usable"],
    };
    const context = {
      partnerId: "partner-acme",
      policyId: "partner-acme-age_21_retail-v1",
      allowSandbox: true,
      now: new Date("2026-01-01T00:00:00.000Z"),
    };
    const fromPackage = packageEvaluatePublicReceiptTrust(receipt, context);
    const fromApp = appEvaluatePublicReceiptTrust(receipt, context);
    expect(fromPackage).toEqual(fromApp);
  });

  it("integration pack catalog stays aligned with launchpad pack ids and disclosed_result", () => {
    for (const pack of INTEGRATION_POLICY_PACKS) {
      const appPack = appResolvePolicyPack(pack.id);
      expect(appPack, `missing app pack ${pack.id}`).not.toBeNull();
      expect(appPack!.disclosed_result).toBe(pack.disclosed_result);
      expect(appPack!.required_claims).toEqual([...pack.required_claims]);
    }
    expect(INTEGRATION_POLICY_PACKS.length).toBe(POLICY_PACK_LIST.length);
  });
});
