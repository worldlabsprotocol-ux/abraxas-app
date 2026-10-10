import { describe, expect, it, vi } from "vitest";
import { buildCieloStagingActivationReport } from "@/lib/cielo/cieloStagingActivation";

describe("buildCieloStagingActivationReport", () => {
  it("defaults demo supabase ref and cielo partner ids", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      deployment_environment: "preview",
      supabase_project_ref: "ocntwbxarpjeixdnzide",
      commit_sha: "abc1234567890",
    }), { status: 200 }));

    const report = await buildCieloStagingActivationReport({
      CIELO_STAGING_BASE_URL: "https://preview.example",
      PARTNER_FLOW_RP_RETURN_URL: "https://preview.example/cielo/verified-rate",
    }, { fetch: fetch as typeof fetch });

    expect(report.merchant.policy_id).toBe("cielo-verified-guest-v1");
    expect(report.merchant.partner_id).toBe("cielo");
    expect(report.universal.deployment_probe?.ok).toBe(true);
  });
});
