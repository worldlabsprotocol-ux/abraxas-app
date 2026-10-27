// FILE: lib/developers/integrationAdoptionPath.test.ts

import { describe, expect, it } from "vitest";
import {
  buildExternalNodePartnerEnvTemplate,
  detectIntegrationAdoptionGaps,
  EXTERNAL_NODE_PARTNER_REFERENCE,
  INTEGRATION_ADOPTION_STEPS,
} from "./integrationAdoptionPath";

describe("integrationAdoptionPath", () => {
  it("defines a ten-step adoption ladder ending in production gate", () => {
    expect(INTEGRATION_ADOPTION_STEPS).toHaveLength(10);
    expect(INTEGRATION_ADOPTION_STEPS[0]?.id).toBe("configure_application");
    expect(INTEGRATION_ADOPTION_STEPS.at(-1)?.id).toBe("production_gate");
  });

  it("flags missing sandbox as blocker", () => {
    const gaps = detectIntegrationAdoptionGaps({
      hasSandboxApplication: false,
      callbackUrl: null,
      apiKeyRevealedOnce: false,
      completedFirstPartyWalletDemo: false,
      completedPartnerHandoff: false,
    });
    expect(gaps.some((g) => g.id === "missing_sandbox_app" && g.severity === "blocker")).toBe(true);
  });

  it("warns when wallet demo completed without partner handoff", () => {
    const gaps = detectIntegrationAdoptionGaps({
      hasSandboxApplication: true,
      callbackUrl: "http://127.0.0.1:3847/callback",
      apiKeyRevealedOnce: true,
      completedFirstPartyWalletDemo: true,
      completedPartnerHandoff: false,
    });
    expect(gaps.some((g) => g.id === "confuses_wallet_demo_with_partner_integration")).toBe(true);
  });

  it("builds external-node env template without embedding secrets", () => {
    const text = buildExternalNodePartnerEnvTemplate({
      baseUrl: "https://demo.abraxasworld.xyz",
      applicationId: "app_test",
      partnerId: "partner_test",
      policyId: "wallet_control",
    });
    expect(text).toContain("ABRAXAS_APPLICATION_ID=app_test");
    expect(text).toContain("ABRAXAS_API_KEY=<paste one-time sandbox key");
    expect(text).toContain(EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase);
  });
});
