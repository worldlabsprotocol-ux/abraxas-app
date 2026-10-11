import { describe, expect, it } from "vitest";
import {
  buildExternalSandboxProvisioningChecklist,
  validateExternalSandboxProvisioningInput,
} from "@/lib/institutional/sandbox/externalPartnerProvisioningKit";

describe("externalPartnerProvisioningKit", () => {
  it("builds checklist without secrets", () => {
    const kit = buildExternalSandboxProvisioningChecklist();
    expect(kit.schema).toBe("external_sandbox_provisioning_kit_v1");
    expect(kit.steps.length).toBeGreaterThan(3);
    const serialized = JSON.stringify(kit);
    expect(serialized).not.toMatch(/abx_test_[a-z0-9]+/i);
  });

  it("validates sandbox provisioning input", () => {
    const ok = validateExternalSandboxProvisioningInput({
      partnerId: "acme-institutional",
      applicationSlug: "acme-sandbox-app",
      policyId: "sandbox_institutional_protocol_access",
      callbackUrl: "https://example.com/callback",
      webhookUrl: "https://example.com/webhook",
      environment: "sandbox",
    });
    expect(ok.ok).toBe(true);

    const bad = validateExternalSandboxProvisioningInput({
      partnerId: "ACME",
      applicationSlug: "x",
      environment: "production",
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});
