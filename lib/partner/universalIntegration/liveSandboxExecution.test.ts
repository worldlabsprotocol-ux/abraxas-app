// FILE: lib/partner/universalIntegration/liveSandboxExecution.test.ts

import { describe, expect, it, vi } from "vitest";
import { runLiveSandboxExecution } from "./liveSandboxExecution";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";

const BASE_ENV = {
  [REFERENCE_RP_ENV_KEYS.partnerId]: "example-merchant-protocol",
  [REFERENCE_RP_ENV_KEYS.policyId]: "example-merchant-age-21-v1",
  [REFERENCE_RP_ENV_KEYS.returnUrl]: "https://app.example-merchant.test/auth/abraxas/callback",
  [REFERENCE_RP_ENV_KEYS.baseUrl]: "https://staging.abraxas.example",
};

describe("runLiveSandboxExecution", () => {
  it("blocks when env is incomplete", async () => {
    const report = await runLiveSandboxExecution({
      fetch: vi.fn(),
      env: {},
    });
    expect(report.overall).toBe("blocked");
    expect(report.live_e2e_complete).toBe(false);
    expect(report.stages[0]?.id).toBe("preflight_env");
  });

  it("does not mock receipt success without live receipt id", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/api/protocol/compatibility")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("", { status: 302 });
    });
    const report = await runLiveSandboxExecution({ fetch, env: BASE_ENV });
    expect(report.overall).toBe("partial");
    expect(report.live_e2e_complete).toBe(false);
    expect(report.blockers).toContain("live_receipt_not_provided");
    const holder = report.stages.find((s) => s.id === "holder_flow");
    expect(holder?.status).toBe("blocked");
  });

  it("validates live receipt when EXAMPLE_MERCHANT_LIVE_RECEIPT_ID is set", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/api/receipts/dr_live_1/public")) {
        return new Response(JSON.stringify({
          receipt_id: "dr_live_1",
          partner_id: BASE_ENV[REFERENCE_RP_ENV_KEYS.partnerId],
          policy_id: BASE_ENV[REFERENCE_RP_ENV_KEYS.policyId],
          decision_result: "approved",
          signature_valid: true,
          expires_at: "2099-01-01T00:00:00.000Z",
          status: "active",
          production_usable: false,
        }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    });
    const report = await runLiveSandboxExecution({
      fetch,
      env: { ...BASE_ENV, EXAMPLE_MERCHANT_LIVE_RECEIPT_ID: "dr_live_1" },
      now: new Date("2026-06-01T12:00:00.000Z"),
    });
    const verify = report.stages.find((s) => s.id === "live_receipt_verify");
    expect(verify?.status).toBe("pass");
    expect(verify?.live).toBe(true);
  });
});
