import { describe, expect, it, beforeEach } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import {
  assessCallbackForEnvironment,
  rejectHolderSuppliedReturnUrl,
  validateRegisteredCallback,
} from "./callbackSecurity";
import {
  issuePartnerRequestCorrelation,
  resetPartnerRequestCorrelationForTests,
  validatePartnerRequestCorrelation,
  embedRequestIdInReturnUrl,
  extractRequestIdFromReturnUrl,
} from "./requestCorrelation";
import {
  clientLiveCredentialCreationRejected,
  holderFlowExposesPartnerSecret,
  partnerKeyEnvironment,
  validatePartnerCredentialBoundary,
} from "./credentialBoundary";
import { evaluateProductionIntegrationReadiness, productionReadinessLeaks } from "./productionReadiness";
import { integrationHandoffLeaks } from "./integrationHandoff";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const APP: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-retail",
  partner_id: "acme",
  application_name: "Acme retail",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback", "https://shop.acme.example/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
};

function evidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: APP.id,
    partnerId: APP.partner_id,
    status: "active",
    environment: "sandbox",
    policyId: APP.policy_id,
    policyVersion: APP.policy_version,
    policyTemplateId: APP.policy_template_id,
    allowedReturnUrls: APP.allowed_return_urls,
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: [],
    starterKitEvidenced: true,
    starterKitRuntime: "typescript_nextjs",
    request: null,
    ...overrides,
  };
}

function sandboxReceipt(overrides: Partial<PartnerFlowPublicReceipt> = {}): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_test",
    schema_version: "1.0.0",
    partner_id: "acme",
    policy_id: "acme-age_21_retail-v1",
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
  } as PartnerFlowPublicReceipt;
}

function productionReceipt(): PartnerFlowPublicReceipt {
  return sandboxReceipt({
    production_usable: true,
    decision_context: "production",
    invalidation_reasons: [],
  });
}

beforeEach(() => {
  resetPartnerRequestCorrelationForTests();
});

describe("callback security", () => {
  it("denies unregistered callback", () => {
    const result = validateRegisteredCallback({
      returnUrl: "https://evil.example/callback",
      allowedUrls: APP.allowed_return_urls,
      environment: "sandbox",
      partnerId: APP.partner_id,
      strictLaunchpad: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("callback_unregistered");
  });

  it("denies wrong partner application binding", () => {
    const result = validateRegisteredCallback({
      returnUrl: "http://localhost:3000/callback",
      allowedUrls: APP.allowed_return_urls,
      environment: "sandbox",
      partnerId: APP.partner_id,
      applicationPartnerId: "other-partner",
      strictLaunchpad: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("callback_wrong_partner");
  });

  it("denies HTTP callback in production environment", () => {
    const result = validateRegisteredCallback({
      returnUrl: "http://localhost:3000/callback",
      allowedUrls: APP.allowed_return_urls,
      environment: "production",
      partnerId: APP.partner_id,
      strictLaunchpad: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("callback_http_in_production");
    expect(result.errors).toContain("callback_wrong_environment");
  });

  it("denies altered return URL beyond allowlist prefix", () => {
    const tamper = rejectHolderSuppliedReturnUrl({
      serverReturnUrl: "https://shop.acme.example/callback",
      holderReturnUrl: "https://evil.example/callback",
    });
    expect(tamper).toBe("callback_return_url_altered");
  });

  it("denies callback belonging to another application via wrong partner", () => {
    const result = validateRegisteredCallback({
      returnUrl: "https://shop.acme.example/callback",
      allowedUrls: ["https://shop.other.example/callback"],
      environment: "production",
      partnerId: APP.partner_id,
      applicationPartnerId: "other-partner",
      strictLaunchpad: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("callback_wrong_partner");
    expect(result.errors).toContain("callback_unregistered");
  });

  it("requires HTTPS for production assessment", () => {
    expect(assessCallbackForEnvironment("http://app.example/cb", "production")).toEqual(["callback_invalid"]);
    expect(assessCallbackForEnvironment("https://app.example/cb", "production")).toEqual([]);
  });
});

describe("request correlation anti-mixup", () => {
  it("issues and validates server-side request binding", () => {
    const binding = issuePartnerRequestCorrelation({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      purpose: "retail_access_a",
      action: "gate_a",
      callbackNormalized: "https://shop.acme.example/callback",
      environment: "sandbox",
    });
    expect(binding.requestId.startsWith("req_")).toBe(true);

    const ok = validatePartnerRequestCorrelation({
      requestId: binding.requestId,
      expectedPartnerId: "acme",
      expectedPolicyId: "acme-age_21_retail-v1",
      expectedEnvironment: "sandbox",
      expectedPurpose: "retail_access_a",
      expectedAction: "gate_a",
    });
    expect(ok.ok).toBe(true);

    const mixup = validatePartnerRequestCorrelation({
      requestId: binding.requestId,
      expectedPartnerId: "acme",
      expectedPolicyId: "acme-age_21_retail-v1",
      expectedEnvironment: "sandbox",
      expectedPurpose: "retail_access_b",
      expectedAction: "gate_b",
    });
    expect(mixup.ok).toBe(false);
  });

  it("embeds request_id in return_url for hosted flow start", () => {
    const url = embedRequestIdInReturnUrl("https://shop.acme.example/callback", "req_abc123");
    expect(extractRequestIdFromReturnUrl(url)).toBe("req_abc123");
  });
});

describe("credential boundary", () => {
  it("isolates sandbox and live key environments", () => {
    expect(partnerKeyEnvironment("abx_test_abc1234567")).toBe("sandbox");
    expect(partnerKeyEnvironment("abx_live_abc1234567")).toBe("production");
  });

  it("denies sandbox credential against production resource", () => {
    const result = validatePartnerCredentialBoundary({
      credential: {
        keyPrefix: "abx_test_abc1234567",
        partnerId: "acme",
        apiKeyId: "k1",
        revoked: false,
        launchpadApplicationId: APP.id,
      },
      expectedEnvironment: "production",
      expectedPartnerId: "acme",
      expectedApplicationId: APP.id,
      applicationStatus: "active",
      productionAccessApproved: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("credential_wrong_environment");
  });

  it("denies revoked live credential", () => {
    const result = validatePartnerCredentialBoundary({
      credential: {
        keyPrefix: "abx_live_abc1234567",
        partnerId: "acme",
        apiKeyId: "k2",
        revoked: true,
        launchpadApplicationId: APP.id,
      },
      expectedEnvironment: "production",
      expectedPartnerId: "acme",
      productionAccessApproved: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("credential_revoked");
  });

  it("denies Partner A credential on Partner B app", () => {
    const result = validatePartnerCredentialBoundary({
      credential: {
        keyPrefix: "abx_live_abc1234567",
        partnerId: "partner-a",
        apiKeyId: "k3",
        revoked: false,
        launchpadApplicationId: APP.id,
      },
      expectedEnvironment: "production",
      expectedPartnerId: "partner-b",
      expectedApplicationId: APP.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("credential_wrong_partner");
  });

  it("rejects client attempts to create live credentials", () => {
    expect(clientLiveCredentialCreationRejected({ issue_production_key: true })).toBe(true);
    expect(clientLiveCredentialCreationRejected({ note: "hello" })).toBe(false);
  });

  it("detects partner secrets in holder-visible payloads", () => {
    expect(holderFlowExposesPartnerSecret({ key: "abx_live_secretvalue123456" })).toBe(true);
    expect(holderFlowExposesPartnerSecret({ outcome: "permitted" })).toBe(false);
  });
});

describe("AbraxasPartnerKit.verifyForAction security", () => {
  it("denies sandbox receipt in production verification", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "production",
      fetchFn: async () => new Response(JSON.stringify(sandboxReceipt()), { status: 200 }),
    });
    const result = await kit.verifyForAction({ receiptId: "dr_test" });
    expect(result.outcome).toBe("environment_mismatch");
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies wrong policy and wrong request correlation", async () => {
    const binding = issuePartnerRequestCorrelation({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      callbackNormalized: "https://shop.acme.example/callback",
      environment: "sandbox",
      purpose: "action_a",
      action: "gate_a",
    });
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify(sandboxReceipt({ policy_id: "other-policy-v1" })), { status: 200 }),
    });
    const wrongPolicy = await kit.verifyForAction({ receiptId: "dr_test" });
    expect(wrongPolicy.outcome).toBe("wrong_policy");

    const kitOk = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify(sandboxReceipt()), { status: 200 }),
    });
    const mixup = await kitOk.verifyForAction({
      receiptId: "dr_test",
      expectedRequestId: binding.requestId,
      callbackRequestId: "req_other_action",
    });
    expect(mixup.outcome).toBe("wrong_request_correlation");

    const permitted = await kitOk.verifyForAction({
      receiptId: "dr_test",
      expectedRequestId: binding.requestId,
      callbackRequestId: binding.requestId,
    });
    expect(permitted.outcome).toBe("permitted");
  });

  it("denies expired and revoked receipts", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify(sandboxReceipt({
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
      })), { status: 200 }),
    });
    expect((await kit.verifyForAction({ receiptId: "dr_test" })).outcome).toBe("expired");

    const revokedKit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify(sandboxReceipt({ status: "revoked" })), { status: 200 }),
    });
    expect((await revokedKit.verifyForAction({ receiptId: "dr_test" })).outcome).toBe("revoked");
  });

  it("permits production receipt in production mode", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "production",
      fetchFn: async () => new Response(JSON.stringify(productionReceipt()), { status: 200 }),
    });
    const result = await kit.verifyForAction({ receiptId: "dr_prod" });
    expect(result.outcome).toBe("permitted");
    expect(permitProtocolAction(result)).toBe(true);
  });
});

describe("production readiness and handoff", () => {
  it("returns explicit blockers rather than generic false", async () => {
    const assessment = await evaluateProductionIntegrationReadiness({
      application: APP,
      evidence: evidence(),
    });
    expect(assessment.ok).toBe(false);
    expect(assessment.blockers.length).toBeGreaterThan(0);
    expect(assessment.blockers).toContain("production_access_not_approved");
    expect(productionReadinessLeaks(assessment)).toEqual([]);
  });

  it("keeps integration handoff payloads free of secrets and PII", () => {
    const sample = {
      application_id: APP.id,
      environment: "sandbox",
      hosted_flow_pattern: "https://abraxasworld.xyz/partner/verify?app=acme-retail",
      verify_recommended_api: "AbraxasPartnerKit.verifyForAction",
      outstanding_blockers: ["production_access_not_approved"],
      privacy_boundary: "No DOB or documents.",
    };
    expect(integrationHandoffLeaks(sample)).toEqual([]);
    expect(JSON.stringify(sample)).not.toMatch(/date_of_birth|legal_name|abx_live_/);
  });
});
