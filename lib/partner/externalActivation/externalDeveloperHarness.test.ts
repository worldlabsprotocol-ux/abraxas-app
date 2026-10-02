import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AbraxasPartnerKit,
  categorizeIntegrationErrors,
  permitProtocolAction,
} from "@/lib/partner/integrationKit";
import {
  createExternalPartnerRequestStore,
} from "@/examples/verify-with-abraxas-external/lib/partnerRequestStore";
import {
  createProtectedActionStore,
} from "@/examples/verify-with-abraxas-external/lib/protectedActionStore";
import { finishExternalVerification, startExternalVerification } from "@/examples/verify-with-abraxas-external/lib/flow";
import { loadExternalVerifyConfig } from "@/examples/verify-with-abraxas-external/lib/config";

const PRIVILEGED = [
  /requireSupabaseAdmin/,
  /credential_claims/,
  /decision_receipts\/service/,
  /getReceiptById/,
  /lib\/admin/,
  /lib\/supabase\/admin/,
];

function handoffFetch(config: ReturnType<typeof loadExternalVerifyConfig>, requestId = "vr_external_harness_1234567890") {
  const receipt = {
    receipt_id: "dr_external",
    schema_version: "1.0.0",
    partner_id: config.partnerId,
    policy_id: config.policyId,
    policy_version: 1,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: ["production_not_usable:false"],
    artifact_type: "eligibility_decision_receipt",
  };
  const narrow = {
    schema_version: "1.0.0",
    receipt_id: "dr_external",
    partner_id: config.partnerId,
    policy_id: config.policyId,
    decision: "approved",
    result_family: "age_eligible_21",
    over_21: true,
  };
  return vi.fn(async (url: string) => {
    if (url.includes("/api/v1/partner-handoff")) {
      return new Response(JSON.stringify({
        ok: true,
        hosted_url: `https://abraxasworld.xyz/partner/continue?verify_request=${requestId}`,
        verify_request: requestId,
        handoff_ref: "ho_external",
        expires_at: "2099-01-01T00:00:00.000Z",
      }), { status: 200 });
    }
    if (url.includes("/narrow-result")) {
      return new Response(JSON.stringify(narrow), { status: 200 });
    }
    return new Response(JSON.stringify(receipt), { status: 200 });
  }) as typeof fetch;
}

describe("external developer harness — public contract only", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  it("completes create → handoff → callback → narrow result → resume without privileged imports", async () => {
    const fixtureRoot = resolve(process.cwd(), "examples/verify-with-abraxas-external/lib");
    for (const file of ["flow.ts", "partnerKit.ts", "config.ts"]) {
      const source = readFileSync(resolve(fixtureRoot, file), "utf8");
      for (const pattern of PRIVILEGED) {
        expect(source, `${file} privileged import`).not.toMatch(pattern);
      }
    }

    const config = loadExternalVerifyConfig({
      ABRAXAS_SANDBOX_API_KEY: "abx_test_external_only",
    });
    const env = { ABRAXAS_SANDBOX_API_KEY: "abx_test_external_only" };
    const stores = {
      partnerRequestStore: createExternalPartnerRequestStore(),
      protectedActionStore: createProtectedActionStore(),
    };
    const fetchFn = handoffFetch(config);

    const started = await startExternalVerification({
      config,
      env,
      stores,
      fetchFn,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const params = new URLSearchParams({
      receipt_id: "dr_external",
    });

    const finished = await finishExternalVerification({
      config,
      env,
      stores,
      searchParams: params,
      expectedRequestId: started.request_id,
      protectedActionKey: "checkout:demo",
      fetchFn,
    });
    expect(finished.resumed, JSON.stringify(finished)).toBe(true);
    expect(finished.narrow?.result_family).toBe("age_eligible_21");

    const duplicate = await finishExternalVerification({
      config,
      env,
      stores,
      searchParams: params,
      expectedRequestId: started.request_id,
      protectedActionKey: "checkout:demo",
      fetchFn,
    });
    expect(duplicate.resumed).toBe(false);
    expect(duplicate.duplicate).toBe(true);
  });

  it("rejects wrong request correlation with stable error category", () => {
    const category = categorizeIntegrationErrors(["request_correlation_mismatch"]);
    expect(category).toBe("invalid_callback");
  });

  it("generated client path never requires api key in verification_url", async () => {
    const config = loadExternalVerifyConfig({ ABRAXAS_SANDBOX_API_KEY: "abx_test_secret" });
    const kit = new AbraxasPartnerKit({
      partnerId: config.partnerId,
      policyId: config.policyId,
      policyVersion: 1,
      environment: "sandbox",
      applicationId: config.applicationId,
      apiKey: "abx_test_secret",
      fetchFn: handoffFetch(config),
    });
    const request = await kit.createVerificationRequest({
      returnUrl: "https://partner.example/callback",
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.verification_url).not.toContain("abx_");
  });

  it("does not permit protected action when verification denies", async () => {
    const denied = {
      outcome: "denied" as const,
      action: "deny" as const,
      errors: ["decision_not_approved"],
      partner_id: "partner-external",
      policy_id: "partner-external-sandbox_economic_demo-v1",
      production_usable: false,
    };
    expect(permitProtocolAction(denied)).toBe(false);
  });
});
