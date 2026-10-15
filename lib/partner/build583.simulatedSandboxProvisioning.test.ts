// FILE: lib/partner/build583.simulatedSandboxProvisioning.test.ts
// In-memory Launchpad provisioning only. Not a customer-facing sandbox execution.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { resetSandboxPartnerMemory, setLaunchpadSchemaMissing } from "@/lib/partner/sandboxPartnerContract/memoryAdmin";
import { SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID } from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";

vi.mock("@/lib/supabase/admin", async () => {
  const memory = await import("@/lib/partner/sandboxPartnerContract/memoryAdmin");
  return {
    requireSupabaseAdmin: () => memory.requireSandboxPartnerTestAdmin(),
    getSupabaseAdmin: () => memory.createSandboxPartnerMemoryAdmin(),
  };
});

import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";

describe("Build #583 simulated sandbox provisioning (memory admin)", () => {
  beforeEach(() => {
    resetSandboxPartnerMemory();
    resetFakeWalletStandardBackend();
    setLaunchpadSchemaMissing(false);
  });

  it("provisions institutional sandbox in simulated store", async () => {
    const created = await provisionLaunchpadSandbox({
      applicationName: "Simulated Institution",
      displayName: "Simulated Institution",
      partnerId: "sim-inst-583",
      policyTemplateId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      returnUrl: "https://integrator.example/abraxas/callback",
      idempotencyKey: "build583-sim-provision",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.result.policy_id).toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID);
  });
});
