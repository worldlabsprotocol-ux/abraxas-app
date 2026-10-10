// FILE: lib/partner/universalIntegration/universalIntegration.test.ts

import { describe, expect, it } from "vitest";
import { buildLaunchpadIntegrationHealth } from "@/lib/partner/launchpad/integrationHealth";
import { REQUIRED_HARNESS_SCENARIOS } from "@/lib/partner/launchpad/partnerTestHarness";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  deriveUniversalIntegrationReadiness,
  UNIVERSAL_READINESS_PHASES,
} from "./readinessDiagnostic";
import {
  EXAMPLE_MERCHANT_INTEGRATION,
  runIndependentPartnerContractProof,
} from "./independentPartnerScenario";
import { conformanceReceiptFixtureCases } from "@/lib/partner/partnerConformanceFixtures";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { CONFORMANCE_FIXTURE_NOW } from "@/lib/partner/partnerConformanceFixtures";

const sandboxApp = {
  id: "app",
  public_slug: "example-merchant",
  partner_id: "example-merchant-protocol",
  application_name: "Example Merchant",
  display_name: "Example Merchant",
  environment: "sandbox",
  policy_id: "example-merchant-age-21-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://app.example-merchant.test/auth/abraxas/callback"],
  api_key_id: "key",
  production_api_key_id: null,
  production_key_revealed_at: null,
  production_activated_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
} satisfies LaunchpadApplicationRow;

function healthFor(app: LaunchpadApplicationRow, overrides: Partial<Parameters<typeof buildLaunchpadIntegrationHealth>[0]> = {}) {
  return buildLaunchpadIntegrationHealth({
    application: app,
    activeSandboxKey: true,
    activeProductionKey: false,
    verifiedHostnames: ["app.example-merchant.test"],
    harnessCompleted: REQUIRED_HARNESS_SCENARIOS,
    ...overrides,
  });
}

describe("deriveUniversalIntegrationReadiness", () => {
  it("exposes stable phase identifiers", () => {
    expect(UNIVERSAL_READINESS_PHASES).toContain("sandbox_testing");
    expect(UNIVERSAL_READINESS_PHASES).toContain("production_active");
  });

  it("starts at not_configured without policy pin", () => {
    const diag = deriveUniversalIntegrationReadiness({
      application: { ...sandboxApp, policy_id: "", policy_version: 0 },
      activeSandboxKey: false,
      activeProductionKey: false,
      verifiedReceiptCount: 0,
      harnessPassed: false,
      productionAccessRequestStatus: null,
      integrationHealthOverall: "blocked",
    });
    expect(diag.phase).toBe("not_configured");
    expect(diag.blockers).toContain("policy_not_pinned");
  });

  it("never marks production active from sandbox success alone", () => {
    const health = healthFor(sandboxApp, { harnessCompleted: REQUIRED_HARNESS_SCENARIOS });
    const diag = deriveUniversalIntegrationReadiness({
      application: sandboxApp,
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedReceiptCount: 2,
      harnessPassed: true,
      productionAccessRequestStatus: null,
      integrationHealthOverall: health.overall,
    });
    expect(diag.phase).toBe("sandbox_verified");
    expect(diag.phase).not.toBe("production_active");
    expect(diag.blockers).toContain("live_e2e_not_observed");
    expect(diag.signals.live_e2e_complete).toBe(false);
  });

  it("requires explicit review before production approved phase", () => {
    const health = healthFor(sandboxApp);
    const diag = deriveUniversalIntegrationReadiness({
      application: sandboxApp,
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedReceiptCount: 1,
      harnessPassed: true,
      productionAccessRequestStatus: "pending",
      integrationHealthOverall: health.overall,
    });
    expect(diag.phase).toBe("production_review_required");
  });

  it("maps suspended applications to suspended_or_revoked", () => {
    const diag = deriveUniversalIntegrationReadiness({
      application: { ...sandboxApp, status: "suspended" },
      activeSandboxKey: true,
      activeProductionKey: false,
      verifiedReceiptCount: 0,
      harnessPassed: false,
      productionAccessRequestStatus: null,
      integrationHealthOverall: "blocked",
    });
    expect(diag.phase).toBe("suspended_or_revoked");
  });
});

describe("independent partner contract proof", () => {
  it("passes automated steps for Example Merchant config", () => {
    const proof = runIndependentPartnerContractProof(EXAMPLE_MERCHANT_INTEGRATION);
    expect(proof.allAutomatedPassed).toBe(true);
    expect(proof.manualStepsRequired).toContain("holder_flow");
    expect(proof.steps.find((s) => s.id === "build_verify_url")?.outcome).toBe("pass");
  });

  it("does not claim full E2E when holder flow is manual", () => {
    const proof = runIndependentPartnerContractProof();
    expect(proof.manualStepsRequired.length).toBeGreaterThan(0);
  });
});

describe("receipt security matrix (offline fixtures)", () => {
  it("fail-closed on invalid, expired, revoked, and wrong-tenant receipts", () => {
    const expectations = {
      partnerId: "your-protocol-partner",
      policyId: "your-protocol-policy-v1",
      now: CONFORMANCE_FIXTURE_NOW,
    };
    for (const fixture of conformanceReceiptFixtureCases()) {
      const result = validatePartnerFlowPublicReceipt(fixture.receipt, {
        ...expectations,
        allowSandbox: fixture.allowSandbox === true,
      });
      expect(result.ok).toBe(fixture.expectValid);
    }
  });
});
