import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  HARNESS_CALLBACK_ALLOWED_KEYS,
  HARNESS_FORBIDDEN_CALLBACK_TERMS,
  REQUIRED_HARNESS_SCENARIOS,
  harnessPassedFromActivity,
  runPartnerHarnessCase,
} from "@/lib/partner/launchpad/partnerTestHarness";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";

describe("partner test harness", () => {
  const signingKey = generateTestSigningKeyPair();

  it("covers every required outcome", () => {
    expect(REQUIRED_HARNESS_SCENARIOS).toEqual([
      "approved",
      "denied",
      "expired",
      "revoked",
      "wrong_partner",
      "wrong_policy",
      "replay",
      "sandbox_not_production",
      "pii_absent",
    ]);
  });

  it("evaluates every pack against every required harness outcome", () => {
    for (const pack of POLICY_PACK_LIST) {
      for (const scenarioId of REQUIRED_HARNESS_SCENARIOS) {
        const result = runPartnerHarnessCase({
          partnerId: "partner-acme",
          policyId: buildLaunchpadPolicyId("partner-acme", pack.id),
          policyVersion: 1,
          policyTemplateId: pack.id,
          scenarioId,
          signingKey,
        });
        if ("ok" in result) throw new Error("unexpected invalid scenario");
        expect(result.simulated).toBe(false);
        expect(result.passed, `${pack.id} ${scenarioId}`).toBe(true);
        expect(result.signature_valid).toBe(true);
        expect(result.verification_path).toContain("evaluatePublicReceiptTrust");
        expect(Object.keys(result.callback_params).sort()).toEqual([...HARNESS_CALLBACK_ALLOWED_KEYS].sort());
        for (const term of HARNESS_FORBIDDEN_CALLBACK_TERMS) {
          expect(JSON.stringify(result.callback_params)).not.toContain(term);
        }
        if (scenarioId === "sandbox_not_production") {
          expect(result.observed_access).toBe("deny");
          expect(result.production_usable).toBe(false);
        }
        if (scenarioId === "replay") {
          expect(result.replay_second_pass).toBe(true);
        }
        if (scenarioId === "pii_absent") {
          expect(result.pii_scan_passed).toBe(true);
        }
      }
    }
  });

  it("rejects unknown scenarios", () => {
    expect(runPartnerHarnessCase({
      partnerId: "p",
      policyId: "p-age_21_retail-v1",
      policyVersion: 1,
      policyTemplateId: "age_21_retail",
      scenarioId: "always_green",
      signingKey,
    })).toEqual({ ok: false, code: "invalid_scenario" });
  });

  it("does not treat partial activity as a passed harness", () => {
    const partial = harnessPassedFromActivity([
      { event_type: "receipt_verified", public_code: "harness_approved_pass", metadata: { scenario: "approved" } },
    ]);
    expect(partial.passed).toBe(false);
    expect(partial.missing).toContain("expired");
    const complete = harnessPassedFromActivity(
      REQUIRED_HARNESS_SCENARIOS.map((scenario) => ({
        event_type: "receipt_verified",
        public_code: `harness_${scenario}_pass`,
        metadata: { scenario },
      })),
    );
    expect(complete.passed).toBe(true);
  });
});
