import { describe, expect, it, vi } from "vitest";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";
import { runExampleMerchantLiveE2e } from "./exampleMerchantLiveE2eRunner";

const ENV = {
  [REFERENCE_RP_ENV_KEYS.partnerId]: "example-merchant-protocol",
  [REFERENCE_RP_ENV_KEYS.policyId]: "example-merchant-age-21-v1",
  [REFERENCE_RP_ENV_KEYS.returnUrl]: "https://app.example-merchant.test/auth/abraxas/callback",
  [REFERENCE_RP_ENV_KEYS.baseUrl]: "https://staging.abraxas.example",
};

describe("runExampleMerchantLiveE2e", () => {
  it("captures callback artifact without storing secrets", async () => {
    const writes: unknown[] = [];
    let currentUrl = "https://staging.abraxas.example/partner/verify";
    const report = await runExampleMerchantLiveE2e({
      browser: {
        goto: async (url) => { currentUrl = url; },
        url: () => currentUrl,
        waitForURL: async (matcher) => {
          currentUrl = "https://app.example-merchant.test/auth/abraxas/callback?receipt_id=dr_pw_1&partner_id=example-merchant-protocol&policy_id=example-merchant-age-21-v1&status=approved";
          expect(matcher(new URL(currentUrl))).toBe(true);
        },
      },
      writeArtifact: async (_path, artifact) => { writes.push(artifact); },
    }, ENV);

    expect(report.overall).toBe("pass");
    expect(writes).toHaveLength(1);
    const artifact = writes[0] as { receipt_id: string; proof_source: string };
    expect(artifact.receipt_id).toBe("dr_pw_1");
    expect(artifact.proof_source).toBe("playwright_callback");
  });

  it("returns checkpoint for manual automation source", async () => {
    const report = await runExampleMerchantLiveE2e({
      browser: {
        goto: vi.fn(),
        url: () => "https://staging.abraxas.example/partner/verify",
        waitForURL: vi.fn(),
      },
    }, { ...ENV, PARTNER_LIVE_E2E_AUTOMATION_SOURCE: "manual_checkpoint" });
    expect(report.overall).toBe("checkpoint");
  });
});
