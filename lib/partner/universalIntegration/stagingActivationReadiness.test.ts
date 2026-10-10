import { describe, expect, it, vi } from "vitest";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";
import { buildStagingActivationReadinessReport, probeStagingDeploymentIdentity } from "./stagingActivationReadiness";

const BASE = {
  [REFERENCE_RP_ENV_KEYS.partnerId]: "example-merchant-protocol",
  [REFERENCE_RP_ENV_KEYS.policyId]: "acme-age_21_retail-v1",
  [REFERENCE_RP_ENV_KEYS.returnUrl]: "https://app.example-merchant.test/auth/abraxas/callback",
  [REFERENCE_RP_ENV_KEYS.baseUrl]: "https://staging-preview.example",
  LAUNCHPAD_EXPECTED_SUPABASE_REF: "ocntwbxarpjeixdnzide",
};

describe("staging activation readiness", () => {
  it("probe accepts matching preview identity", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      deployment_environment: "preview",
      supabase_project_ref: "ocntwbxarpjeixdnzide",
      commit_sha: "abc1234567890",
    }), { status: 200 }));
    const probe = await probeStagingDeploymentIdentity({
      baseUrl: "https://staging-preview.example",
      expectedSupabaseRef: "ocntwbxarpjeixdnzide",
      fetch: fetch as typeof fetch,
    });
    expect(probe.ok).toBe(true);
  });

  it("report blocks when PARTNER_FLOW_RP missing", async () => {
    const report = await buildStagingActivationReadinessReport({});
    expect(report.overall).toBe("blocked");
    expect(report.findings.some((f) => f.id === "partner_flow_rp_config")).toBe(true);
  });

  it("report includes deployment probe when base URL configured", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      deployment_environment: "preview",
      supabase_project_ref: "ocntwbxarpjeixdnzide",
      commit_sha: "abc1234567890",
    }), { status: 200 }));
    const report = await buildStagingActivationReadinessReport(BASE, { fetch: fetch as typeof fetch });
    expect(report.deployment_probe?.ok).toBe(true);
  });
});
