// FILE: lib/partner/build582.institutionalPartnerSandboxJourney.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { resetSandboxPartnerMemory, setLaunchpadSchemaMissing } from "@/lib/partner/sandboxPartnerContract/memoryAdmin";
import { SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID } from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";
import { computeIntegrationVelocity } from "@/lib/partner/valueEvidence/velocity";

vi.mock("@/lib/supabase/admin", async () => {
  const memory = await import("@/lib/partner/sandboxPartnerContract/memoryAdmin");
  return {
    requireSupabaseAdmin: () => memory.requireSandboxPartnerTestAdmin(),
    getSupabaseAdmin: () => memory.createSandboxPartnerMemoryAdmin(),
  };
});

import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";

describe("Build #582 institutional partner sandbox first verification path", () => {
  beforeEach(() => {
    resetSandboxPartnerMemory();
    resetFakeWalletStandardBackend();
    setLaunchpadSchemaMissing(false);
  });

  it("provisions sandbox app pinned to institutional protocol access policy", async () => {
    const created = await provisionLaunchpadSandbox({
      applicationName: "Institutional Sandbox Co",
      displayName: "Institutional Sandbox",
      partnerId: "inst-sandbox-582",
      policyTemplateId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      returnUrl: "https://integrator.example/abraxas/callback",
      idempotencyKey: "build582-institutional-provision",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.result.policy_id).toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID);
    expect(created.result.hosted_verify_url).toContain("/partner/verify");
  });

  it("measures time to first verification as unavailable without live events", () => {
    const metrics = computeIntegrationVelocity({
      application: {
        id: "app_582",
        partner_id: "inst-sandbox-582",
        created_at: new Date().toISOString(),
        production_activated_at: null,
      } as import("@/lib/partner/launchpad/types").LaunchpadApplicationRow,
      events: [],
      activity: [],
    });
    expect(metrics.application_created_to_first_successful_verification.quality).toBe("unavailable");
    expect(metrics.application_created_to_first_holder_consent.quality).toBe("unavailable");
  });

  it("measures holder consent to first verify when events exist", () => {
    const created = "2026-01-01T00:00:00.000Z";
    const metrics = computeIntegrationVelocity({
      application: {
        id: "app_582",
        partner_id: "inst-sandbox-582",
        created_at: created,
        production_activated_at: null,
      } as import("@/lib/partner/launchpad/types").LaunchpadApplicationRow,
      events: [
        {
          event_id: "ie_a",
          partner_id: "inst-sandbox-582",
          application_id: "app_582",
          environment: "sandbox",
          event_type: "holder_flow_completed",
          lifecycle_stage: "holder",
          outcome: "completed",
          partner_safe_reason: null,
          request_id: "req_a",
          receipt_id: "dr_a",
          policy_id: "sandbox_institutional_protocol_access",
          policy_version: 1,
          correlation_id: null,
          handoff_ref: null,
          latency_ms: null,
          metadata: {},
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          event_id: "ie_b",
          partner_id: "inst-sandbox-582",
          application_id: "app_582",
          environment: "sandbox",
          event_type: "receipt_verification_succeeded",
          lifecycle_stage: "verification",
          outcome: "permitted",
          partner_safe_reason: null,
          request_id: "req_a",
          receipt_id: "dr_a",
          policy_id: "sandbox_institutional_protocol_access",
          policy_version: 1,
          correlation_id: null,
          handoff_ref: null,
          latency_ms: 12,
          metadata: {},
          created_at: "2026-01-03T00:00:00.000Z",
        },
      ] as import("@/lib/partner/integrationObservability/record").IntegrationEventRow[],
      activity: [{ event_type: "partner_flow_request_configured", created_at: "2026-01-01T12:00:00.000Z" }],
    });
    expect(metrics.application_created_to_first_holder_consent.quality).toBe("measured");
    expect(metrics.application_created_to_first_successful_verification.duration_ms).toBe(
      new Date("2026-01-03T00:00:00.000Z").getTime() - new Date(created).getTime(),
    );
  });
});
