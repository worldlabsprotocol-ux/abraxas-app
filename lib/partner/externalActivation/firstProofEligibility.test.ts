import { describe, expect, it } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  assessDeterministicFirstProofEligibility,
  buildSandboxEconomicDemoEvidence,
} from "./firstProofEligibility";

function app(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app_test",
    public_slug: "test-app",
    partner_id: "studio-test-abc",
    application_name: "Test App",
    display_name: "Test App",
    environment: "sandbox",
    policy_id: "studio-test-abc-sandbox_economic_demo-v1",
    policy_version: 1,
    policy_template_id: "sandbox_economic_demo",
    allowed_return_urls: ["http://localhost:3000/callback"],
    api_key_id: "key_1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assessDeterministicFirstProofEligibility", () => {
  it("allows sandbox_economic_demo as optional fast-start only", () => {
    const result = assessDeterministicFirstProofEligibility(app());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("sandbox_economic_demo");
    expect(result.pack.id).toBe("sandbox_economic_demo");
  });

  it("rejects age policies that require identity evidence", () => {
    const result = assessDeterministicFirstProofEligibility(app({
      policy_id: "studio-test-abc-age_21_retail-v1",
      policy_template_id: "age_21_retail",
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("live_holder_required");
    expect(result.detail.toLowerCase()).toContain("live sandbox holder flow");
    expect(result.detail.toLowerCase()).toContain("do not substitute");
  });

  it("rejects provenance without live holder artifact binding", () => {
    const result = assessDeterministicFirstProofEligibility(app({
      policy_id: "studio-test-abc-content_origin_disclosure-v1",
      policy_template_id: "content_origin_disclosure",
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("live_holder_required");
    expect(result.detail.toLowerCase()).toContain("artifact fingerprint");
  });
});

describe("buildSandboxEconomicDemoEvidence", () => {
  it("derives sandbox-only claims that satisfy economic demo via canonical evaluator", () => {
    const subjectId = "0x0000000000000000000000000000000000000000000000000000000000000abc";
    const claims = buildSandboxEconomicDemoEvidence({
      verifyRequestId: "vr_demo_1234567890",
      partnerId: "studio-test-abc",
      policyId: "studio-test-abc-sandbox_economic_demo-v1",
      policyVersion: 1,
      subjectId,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0]?.issuer_id).toBe("issuer:abraxas-sandbox");
    expect(claims[0]?.claim_value.environment).toBe("sandbox");

    const evaluation = evaluatePolicyRules(POLICY_PACKS.sandbox_economic_demo.rules, claims);
    expect(evaluation.decision).toBe("approved");
    expect(evaluation.production_usable).toBe(false);
    expect(evaluation.claims.identity_verified).toBeUndefined();
  });

  it("does not satisfy age_21_retail when misapplied", () => {
    const claims = buildSandboxEconomicDemoEvidence({
      verifyRequestId: "vr_demo_1234567890",
      partnerId: "studio-test-abc",
      policyId: "studio-test-abc-sandbox_economic_demo-v1",
      policyVersion: 1,
      subjectId: "0xabc",
    });
    const evaluation = evaluatePolicyRules(POLICY_PACKS.age_21_retail.rules, claims);
    expect(evaluation.decision).toBe("denied");
    expect(evaluation.production_usable).toBe(false);
  });
});
