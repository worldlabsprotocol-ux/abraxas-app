import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AbraxasPartnerKit,
  categorizeIntegrationErrors,
  MemoryPartnerRequestStateStore,
  permitProtocolAction,
  resolvePolicyIntegrationCapabilities,
  validateVerificationRequestCapabilities,
} from "@/lib/partner/integrationKit";
import {
  issuePartnerRequestCorrelation,
  resetPartnerRequestCorrelationForTests,
} from "@/lib/partner/productionIntegration/requestCorrelation";
import {
  createExternalPartnerRequestStore,
} from "@/examples/verify-with-abraxas-external/lib/partnerRequestStore";
import {
  createProtectedActionStore,
} from "@/examples/verify-with-abraxas-external/lib/protectedActionStore";
import { finishExternalVerification, startExternalVerification } from "@/examples/verify-with-abraxas-external/lib/flow";
import { loadExternalVerifyConfig } from "@/examples/verify-with-abraxas-external/lib/config";

function handoffFetch() {
  return vi.fn(async () => new Response(JSON.stringify({
    ok: true,
    hosted_url: "https://abraxasworld.xyz/partner/continue?verify_request=vr_test",
    verify_request: "vr_test1234567890",
    handoff_ref: "ho_test",
    expires_at: "2099-01-01T00:00:00.000Z",
  }), { status: 200 })) as typeof fetch;
}

function ageKit(overrides: Partial<ConstructorParameters<typeof AbraxasPartnerKit>[0]> = {}) {
  return new AbraxasPartnerKit({
    partnerId: "partner-acme",
    policyId: "partner-acme-age_21_retail-v1",
    policyPackId: "age_21_retail",
    policyVersion: 1,
    environment: "sandbox",
    applicationId: "app_acme",
    apiKey: "abx_test_secret",
    fetchFn: handoffFetch(),
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
    apiKey: "abx_test_secret",
    fetchFn: handoffFetch(),
    ...overrides,
  });
}

function approvedAgeReceipt(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function approvedAgeNarrow() {
  return {
    schema_version: "1.0.0",
    receipt_id: "dr_uni",
    partner_id: "partner-acme",
    policy_id: "partner-acme-age_21_retail-v1",
    decision: "approved",
    result_family: "age_eligible_21",
    over_21: true,
  };
}

describe("Verify with Abraxas universal primitive", () => {
  beforeEach(() => {
    resetPartnerRequestCorrelationForTests();
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  it("defaults to hosted handoff and requires sandbox credentials", async () => {
    const missing = await ageKit({ apiKey: undefined }).createVerificationRequest({
      returnUrl: "https://partner.example/callback",
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.errors).toContain("api_key_required");

    const request = await ageKit().createVerificationRequest({
      returnUrl: "https://partner.example/callback",
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.mode).toBe("hosted_handoff");
    expect(request.request_id.startsWith("vr_")).toBe(true);
    expect(request.verification_url).not.toContain("abx_");
  });

  it("creates hosted handoff for provenance with expected content hash", async () => {
    const hash = "a".repeat(64);
    const request = await provenanceKit().createVerificationRequest({
      returnUrl: "https://publisher.example/callback",
      expectedContentHash: hash,
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.mode).toBe("hosted_handoff");
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
    expect(request.errors).toContain("expected_content_hash_required");
  });

  it("does not silently downgrade to redirect when handoff credentials are missing", async () => {
    const request = await new AbraxasPartnerKit({
      partnerId: "partner-acme",
      policyId: "partner-acme-age_21_retail-v1",
      environment: "sandbox",
      applicationId: "app_acme",
    }).createVerificationRequest({
      returnUrl: "https://partner.example/callback",
    });
    expect(request.ok).toBe(false);
    if (request.ok) return;
    expect(request.mode).toBeUndefined();
    expect(request.errors).toContain("api_key_required");
  });

  it("redirect legacy mode requires partner durable request state store", async () => {
    const request = await ageKit().createVerificationRequest({
      returnUrl: "https://partner.example/callback",
      mode: "redirect",
    });
    expect(request.ok).toBe(false);
    if (request.ok) return;
    expect(request.errors).toContain("redirect_requires_request_state_store_or_request_id");
  });

  it("redirect legacy mode persists req_* in partner request state store", async () => {
    const store = new MemoryPartnerRequestStateStore();
    const request = await ageKit({ requestStateStore: store, fetchFn: handoffFetch() }).createVerificationRequest({
      returnUrl: "https://partner.example/callback",
      mode: "redirect",
    });
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.mode).toBe("redirect");
    expect(request.request_id.startsWith("req_")).toBe(true);
    expect(store.get(request.request_id)).not.toBeNull();
  });

  it("verifyCallbackWithNarrowResult fails closed on wrong partner receipt", async () => {
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) {
          return new Response(JSON.stringify({ schema_version: "1.0.0", decision: "approved" }), { status: 200 });
        }
        return new Response(JSON.stringify(approvedAgeReceipt({ partner_id: "other-partner" })), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_uni" }),
    });
    expect(verified.ok).toBe(false);
    expect(verified.category).toBe("application_mismatch");
  });

  it("verifyCallbackWithNarrowResult enforces callback request_id mismatch", async () => {
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(approvedAgeNarrow()), { status: 200 });
        return new Response(JSON.stringify(approvedAgeReceipt()), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_uni", request_id: "req_wrong" }),
      expectedRequestId: "vr_expected123456",
    });
    expect(verified.ok).toBe(false);
    expect(verified.category).toBe("invalid_callback");
  });

  it("accepts durable vr_* correlation without process-local Map", async () => {
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(approvedAgeNarrow()), { status: 200 });
        return new Response(JSON.stringify(approvedAgeReceipt()), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_uni" }),
      expectedRequestId: "vr_test1234567890",
    });
    expect(verified.ok).toBe(true);
  });

  it("returns age narrow result without DOB fields", async () => {
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(approvedAgeNarrow()), { status: 200 });
        return new Response(JSON.stringify(approvedAgeReceipt({ receipt_id: "dr_age" })), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_age" }),
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(JSON.stringify(verified.narrow)).not.toMatch(/date_of_birth|"dob"/i);
  });

  it("returns provenance narrow result without artifact_id or content_hash", async () => {
    const policyId = "partner-publisher-content_origin_disclosure-v1";
    const client = provenanceKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) {
          return new Response(JSON.stringify({
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
          }), { status: 200 });
        }
        return new Response(JSON.stringify(approvedAgeReceipt({
          receipt_id: "dr_prov",
          partner_id: "partner-publisher",
          policy_id: policyId,
        })), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_prov" }),
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(JSON.stringify(verified.narrow)).not.toMatch(/artifact_id|content_hash|raw_content/i);
  });

  it("external fixture uses no privileged imports", () => {
    const files = [
      "lib/config.ts",
      "lib/partnerKit.ts",
      "lib/flow.ts",
      "lib/partnerRequestStore.ts",
      "lib/protectedActionStore.ts",
    ];
    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), "examples/verify-with-abraxas-external", file), "utf8");
      expect(source).not.toMatch(/requireSupabaseAdmin|credential_claims|decision_receipts\/service|getReceiptById/);
      expect(source).not.toMatch(/lib\/admin|lib\/supabase\/admin/);
    }
  });

  it("maps stable error categories", () => {
    expect(categorizeIntegrationErrors(["receipt_expired"])).toBe("receipt_expired");
    expect(categorizeIntegrationErrors(["sandbox_credentials_required"])).toBe("invalid_request");
    expect(categorizeIntegrationErrors(["request_state_store_required"])).toBe("invalid_request");
  });
});

describe("multi-instance durability", () => {
  const config = loadExternalVerifyConfig({});
  const env = { ABRAXAS_SANDBOX_API_KEY: "abx_test_fixture" };
  let sharedRequestStore: ReturnType<typeof createExternalPartnerRequestStore>;
  let sharedActionStore: ReturnType<typeof createProtectedActionStore>;

  beforeEach(() => {
    sharedRequestStore = createExternalPartnerRequestStore();
    sharedActionStore = createProtectedActionStore();
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  function receiptFetch() {
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
    return vi.fn(async (url: string) => {
      if (url.includes("/narrow-result")) return new Response(JSON.stringify(narrow), { status: 200 });
      if (url.includes("/partner-handoff")) {
        return new Response(JSON.stringify({
          ok: true,
          hosted_url: "https://abraxasworld.xyz/partner/continue?verify_request=vr_ext1234567890",
          verify_request: "vr_ext1234567890",
          expires_at: "2099-01-01T00:00:00.000Z",
        }), { status: 200 });
      }
      return new Response(JSON.stringify(receipt), { status: 200 });
    }) as typeof fetch;
  }

  it("START on process A, callback on process B after A disappears", async () => {
    const fetchFn = receiptFetch();
    const started = await startExternalVerification({
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      fetchFn,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const requestId = started.request_id;
    delete (globalThis as { processA?: boolean }).processA;

    const params = new URLSearchParams({ receipt_id: "dr_ext" });
    const result = await finishExternalVerification({
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      searchParams: params,
      expectedRequestId: requestId,
      protectedActionKey: "order_99",
      fetchFn,
    });
    expect(result.resumed).toBe(true);
  });

  it("rejects callback when pending request is unknown", async () => {
    const result = await finishExternalVerification({
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      searchParams: new URLSearchParams({ receipt_id: "dr_ext" }),
      expectedRequestId: "vr_unknown0000000000",
      protectedActionKey: "order_100",
      fetchFn: receiptFetch(),
    });
    expect(result.resumed).toBe(false);
    expect(result.errors).toContain("pending_request_missing");
  });

  it("rejects tampered callback request_id", async () => {
    const fetchFn = receiptFetch();
    const started = await startExternalVerification({
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      fetchFn,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const result = await finishExternalVerification({
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      searchParams: new URLSearchParams({
        receipt_id: "dr_ext",
        request_id: "vr_tampered000000000",
      }),
      expectedRequestId: started.request_id,
      protectedActionKey: "order_101",
      fetchFn,
    });
    expect(result.resumed).toBe(false);
    expect(result.errors).toContain("request_correlation_mismatch");
  });

  it("protected action occurs at most once across duplicate callbacks", async () => {
    const fetchFn = receiptFetch();
    const started = await startExternalVerification({
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      fetchFn,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const input = {
      config,
      env,
      stores: { partnerRequestStore: sharedRequestStore, protectedActionStore: sharedActionStore },
      searchParams: new URLSearchParams({ receipt_id: "dr_ext" }),
      expectedRequestId: started.request_id,
      protectedActionKey: "order_dup",
      fetchFn,
    };
    expect((await finishExternalVerification(input)).resumed).toBe(true);
    const replay = await finishExternalVerification(input);
    expect(replay.resumed).toBe(false);
    expect(replay.duplicate).toBe(true);
  });

  it("legacy redirect req_* requires durable store outside vitest production path", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: config.partnerId,
      policyId: config.policyId,
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify({
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
      }), { status: 200 }),
    });
    const originalVitest = process.env.VITEST;
    delete process.env.VITEST;
    const result = await kit.verifyForAction({
      receiptId: "dr_ext",
      expectedRequestId: "req_missing000000000",
      callbackRequestId: "req_missing000000000",
    });
    process.env.VITEST = originalVitest;
    expect(result.errors).toContain("request_state_store_required");
  });
});

describe("PartnerKit regression — universal primitive preserves verifyForAction", () => {
  it("still permits valid sandbox receipt via verifyForAction", async () => {
    const result = await ageKit({
      fetchFn: async () => new Response(JSON.stringify(approvedAgeReceipt({ receipt_id: "dr_reg" })), { status: 200 }),
    }).verifyForAction({ receiptId: "dr_reg" });
    expect(permitProtocolAction(result)).toBe(true);
  });

  it("vitest legacy req_* correlation remains available for existing tests", async () => {
    resetPartnerRequestCorrelationForTests();
    const binding = issuePartnerRequestCorrelation({
      partnerId: "partner-acme",
      policyId: "partner-acme-age_21_retail-v1",
      callbackNormalized: "https://partner.example/callback",
      environment: "sandbox",
    });
    const client = ageKit({
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) return new Response(JSON.stringify(approvedAgeNarrow()), { status: 200 });
        return new Response(JSON.stringify(approvedAgeReceipt()), { status: 200 });
      },
    });
    const verified = await client.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: "dr_uni", request_id: binding.requestId }),
      expectedRequestId: binding.requestId,
    });
    expect(verified.ok).toBe(true);
  });
});
