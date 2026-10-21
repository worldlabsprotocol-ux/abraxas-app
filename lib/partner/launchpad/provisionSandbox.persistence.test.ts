import { afterEach, describe, expect, it, vi } from "vitest";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";

describe("provisionLaunchpadSandbox persistence reachability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetPersistenceClientForTests();
  });

  it("returns not_configured when PostgREST URL is the CI placeholder host", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "placeholder_service_role_key");
    const { provisionLaunchpadSandbox } = await import("@/lib/partner/launchpad/provisionSandbox");

    const result = await provisionLaunchpadSandbox({
      applicationName: "Placeholder test",
      displayName: "Placeholder test",
      partnerId: "studio-placeholder-abc123456789",
      policyTemplateId: "wallet_control",
      returnUrl: "http://localhost:3000/callback",
      idempotencyKey: "placeholder-provision-test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });
});
