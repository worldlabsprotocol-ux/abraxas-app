// FILE: lib/partner/build583.externalInstitutionalAcceptance.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { resetSandboxPartnerMemory, setLaunchpadSchemaMissing } from "@/lib/partner/sandboxPartnerContract/memoryAdmin";
import { SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID } from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";
import { INSTITUTIONAL_SANDBOX_STUDIO_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";

vi.mock("@/lib/supabase/admin", async () => {
  const memory = await import("@/lib/partner/sandboxPartnerContract/memoryAdmin");
  return {
    requireSupabaseAdmin: () => memory.requireSandboxPartnerTestAdmin(),
    getSupabaseAdmin: () => memory.createSandboxPartnerMemoryAdmin(),
  };
});

import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";

describe("Build #583 external institutional acceptance prerequisites", () => {
  beforeEach(() => {
    resetSandboxPartnerMemory();
    resetFakeWalletStandardBackend();
    setLaunchpadSchemaMissing(false);
  });

  it("exposes canonical institutional studio entry with policy fit parameters", () => {
    expect(INSTITUTIONAL_SANDBOX_STUDIO_HREF).toContain("sandbox_institutional_protocol_access");
    expect(INSTITUTIONAL_SANDBOX_STUDIO_HREF).toContain("org_protocol_access");
    expect(INSTITUTIONAL_SANDBOX_STUDIO_HREF).toContain("institutional_eligibility");
  });

  it("provisions institutional sandbox without operator intervention", async () => {
    const created = await provisionLaunchpadSandbox({
      applicationName: "External Institution",
      displayName: "External Institution",
      partnerId: "external-inst-583",
      policyTemplateId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      returnUrl: "https://partner.example/callback",
      idempotencyKey: "build583-external-provision",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.result.policy_id).toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID);
    expect(created.result.hosted_verify_url).toMatch(/\/partner\/verify/);
  });
});
