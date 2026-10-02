import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AbraxasPartnerKit,
  categorizeIntegrationErrors,
  permitProtocolAction,
  resolvePolicyIntegrationCapabilities,
  validateVerificationRequestCapabilities,
} from "@/lib/partner/integrationKit";
import {
  issuePartnerRequestCorrelation,
  resetPartnerRequestCorrelationForTests,
} from "@/lib/partner/productionIntegration/requestCorrelation";
import { resetExternalActionStoreForTests, tryCompleteProtectedAction } from "@/examples/verify-with-abraxas-external/lib/idempotency";
import { finishExternalVerification, startExternalVerification } from "@/examples/verify-with-abraxas-external/lib/flow";
import { loadExternalVerifyConfig } from "@/examples/verify-with-abraxas-external/lib/config";

function ageKit(overrides: Partial<ConstructorParameters<typeof AbraxasPartnerKit>[0]> = {}) {
  return new AbraxasPartnerKit({
    partnerId: "partner-acme",
    policyId: "partner-acme-age_21_retail-v1",
    policyPackId: "age_21_retail",
    policyVersion: 1,
    environment: "sandbox",
    applicationId: "app_acme",
    ...overrides,
  });
}

function provenanceKit(overrides: Partial<ConstructorParameters<typeof AbraxasPartnerKit>[0]> = {}) {
  return new AbraxasPartnerKit({
    partnerId: "partner-publisher",
    policyId: "partner-publisher-content_origin_disclosure-v1",
    policyPackId: "content_origin_disclosure",
    policyVersion: 1,
    environment: "sandbox",
    applicationId: "app_publisher",
    ...overrides,
  });
}

describe("Verify with Abraxas universal primitive", () => {
  beforeEach(() => {
    resetPartnerRequestCorrelationForTests();
    resetExternalActionStoreForTests();
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  it("creates redirect verification request for age policy without artifact binding", async () => {
    const request = await ageKit().createVerificationRequest({
      returnUrl: "https://partner.example/callback",
    });
    expect(request.ok, JSON.stringify(request)).toBe(true);
    if (!request.ok) return;
    expect(request.mode).toBe("redirect");
    expect(request.request_id.startsWith("req_")).toBe(true);
    expect(request.verification_url).toContain("/partner/verify");
    expect(request.verification_url).not.toContain("abx_");
    expect(request.verification_url).not.toContain("expected_content_hash");
  });

  it("creates redirect verification request for provenance with expected content hash", async () => {
    const hash = "a".repeat(64);
    const request = await provenanceKit().createVerificationRequest({
      returnUrl: "https://publisher.example/callback",
      expectedContentHash: hash,
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.verification_url).toContain(`expected_content_hash=${hash}`);
  });

  it("policy capabilities drive optional binding behavior", () => {
    const ageCaps = resolvePolicyIntegrationCapabilities({ policyPackId: "age_21_retail" });
    const provenanceCaps = resolvePolicyIntegrationCapabilities({ policyPackId: "content_origin_disclosure" });
    expect(ageCaps.requiresExpectedContentHash).toBe(false);
    expect(provenanceCaps.requiresExpectedContentHash).toBe(true);
    expect(validateVerificationRequestCapabilities(provenanceCaps, {}).ok).toBe(false);
    expect(validateVerificationRequestCapabilities(provenanceCaps, { expectedContentHash: "a".repeat(64) }).ok).toBe(true);
  });

  it("rejects provenance request without expected content hash", async () => {
    const request = await provenanceKit().createVerificationRequest({
      returnUrl: "https://publisher.example/callback",
    });
    expect(request.ok).toBe(false);
    if (request.ok) return;
    expect(request.category).toBe("invalid_request");
    expect(request.errors).toContain("expected_content_hash_required");
  });

  it("creates hosted handoff request when api key and application id are configured", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      hosted_url: "https://abraxasworld.xyz/partner/continue?verify_request=vr_test",
      verify_request: "vr_test123456",
      handoff_ref: "ho_test",
      expires_at: "2099-01-01T00:00:00.000Z",
    }), { status: 200 })) as typeof fetch;

    const request = await ageKit({
      apiKey: "abx_test_secret",
      fetchFn,
    }).createVerificationRequest({
      returnUrl: "https://partner.example/callback",
      mode: "hosted_handoff",
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.mode).toBe("hosted_handoff");
    expect(request.request_id).toBe("vr_test123456");
    expect(String(fetchFn.mock.calls[0]?.[1]?.headers)).not.toContain("undefined");
  });

  it("verifyCallbackWithNarrowResult fails closed on wrong partner receipt", async () => {
    const receipt = {
      receipt_id: "dr_uni",
      schema_version: "1.0.0",
      partner_id: "other-partner",
      policy_id: "partner-acme-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: false,
      currently_valid: true,
      invalidation_reasons: [],
    };
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) {
          return new Response(JSON.stringify({ schema_version: "1.0.0", decision: "approved" }), { status: 200 });
        }
        return new Response(JSON.stringify(receipt), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_uni" }),
    });
    expect(verified.ok).toBe(false);
    expect(verified.category).toBe("application_mismatch");
  });

  it("verifyCallbackWithNarrowResult enforces request correlation", async () => {
    const receipt = {
      receipt_id: "dr_uni",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
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
      receipt_id: "dr_uni",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      decision: "approved",
      result_family: "age_eligible_21",
      over_21: true,
    };
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(narrow), { status: 200 });
        return new Response(JSON.stringify(receipt), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_uni", request_id: "req_wrong" }),
      expectedRequestId: "req_expected",
    });
    expect(verified.ok).toBe(false);
    expect(verified.category).toBe("invalid_callback");
  });

  it("returns age narrow result without DOB fields", async () => {
    const receipt = {
      receipt_id: "dr_age",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
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
      receipt_id: "dr_age",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      decision: "approved",
      result_family: "age_eligible_21",
      over_21: true,
    };
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(narrow), { status: 200 });
        return new Response(JSON.stringify(receipt), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_age" }),
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    const json = JSON.stringify(verified.narrow);
    expect(json).not.toMatch(/date_of_birth|"dob"/i);
    expect(verified.narrow.over_21).toBe(true);
  });

  it("returns provenance narrow result without artifact_id or content_hash", async () => {
    const policyId = "partner-publisher-content_origin_disclosure-v1";
    const receipt = {
      receipt_id: "dr_prov",
      schema_version: "1.0.0",
      partner_id: "partner-publisher",
      policy_id: policyId,
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
      receipt_id: "dr_prov",
      partner_id: "partner-publisher",
      policy_id: policyId,
      decision: "approved",
      result_family: "content_origin_disclosed",
      provenance: {
        creator_attested: true,
        ai_assistance_disclosed: "none_declared",
        source_integrity_verified: true,
      },
    };
    const client = provenanceKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(narrow), { status: 200 });
        return new Response(JSON.stringify(receipt), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_prov" }),
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    const json = JSON.stringify(verified.narrow);
    expect(json).not.toMatch(/artifact_id|content_hash|raw_content/i);
    expect(verified.narrow.provenance?.creator_attested).toBe(true);
  });

  it("duplicate callback does not duplicate protected partner action", async () => {
    expect(tryCompleteProtectedAction("checkout_1").ok).toBe(true);
    expect(tryCompleteProtectedAction("checkout_1").ok).toBe(false);
  });

  it("external fixture uses no privileged imports", () => {
    const files = ["lib/config.ts", "lib/partnerKit.ts", "lib/flow.ts", "lib/idempotency.ts"];
    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), "examples/verify-with-abraxas-external", file), "utf8");
      expect(source).not.toMatch(/requireSupabaseAdmin|credential_claims|decision_receipts\/service|getReceiptById/);
      expect(source).not.toMatch(/lib\/admin|lib\/supabase\/admin/);
    }
  });

  it("client bundle path never includes api key in verification url", async () => {
    const request = await ageKit({ apiKey: "abx_test_never_in_browser" }).createVerificationRequest({
      returnUrl: "https://partner.example/callback",
      mode: "redirect",
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.verification_url).not.toContain("abx_test");
  });

  it("maps stable error categories", () => {
    expect(categorizeIntegrationErrors(["receipt_expired"])).toBe("receipt_expired");
    expect(categorizeIntegrationErrors(["rate_limited"])).toBe("rate_limited");
    expect(categorizeIntegrationErrors(["callback_untrusted"])).toBe("invalid_callback");
    expect(categorizeIntegrationErrors(["policy_mismatch:expected=x"])).toBe("policy_mismatch");
  });

  it("external fixture finish flow is idempotent on replay", async () => {
    const config = loadExternalVerifyConfig({});
    const receipt = {
      receipt_id: "dr_ext",
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
      receipt_id: "dr_ext",
      partner_id: config.partnerId,
      policy_id: config.policyId,
      decision: "approved",
      result_family: "age_eligible_21",
      over_21: true,
    };
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/narrow-result")) return new Response(JSON.stringify(narrow), { status: 200 });
      return new Response(JSON.stringify(receipt), { status: 200 });
    }) as typeof fetch;
    const correlation = issuePartnerRequestCorrelation({
      partnerId: config.partnerId,
      policyId: config.policyId,
      callbackNormalized: config.returnUrl,
      environment: "sandbox",
    });
    const params = new URLSearchParams({ receipt_id: "dr_ext", request_id: correlation.requestId });
    const input = {
      config,
      env: {},
      searchParams: params,
      expectedRequestId: correlation.requestId,
      protectedActionKey: "order_99",
      fetchFn,
    };
    const first = await finishExternalVerification(input);
    const second = await finishExternalVerification(input);
    expect(first.resumed).toBe(true);
    expect(second.resumed).toBe(false);
    expect(second.duplicate).toBe(true);
  });

  it("external start uses redirect mode without operator api key", async () => {
    const config = loadExternalVerifyConfig({});
    const started = await startExternalVerification({ config, env: {} });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.mode).toBe("redirect");
  });
});

describe("PartnerKit regression — universal primitive preserves verifyForAction", () => {
  it("still permits valid sandbox receipt via verifyForAction", async () => {
    const receipt = {
      receipt_id: "dr_reg",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
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
    const result = await ageKit({
      fetchFn: async () => new Response(JSON.stringify(receipt), { status: 200 }),
    }).verifyForAction({ receiptId: "dr_reg" });
    expect(permitProtocolAction(result)).toBe(true);
  });
});
