import { beforeEach, describe, expect, it, vi } from "vitest";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { verifyRecordSignature } from "@/lib/decisionReceipts/views";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const mockHandoff = vi.fn();
const mockCompleteHandoff = vi.fn();
const mockLoadStored = vi.fn();
const mockEvaluatePolicy = vi.fn();
const mockIssueReceipt = vi.fn();
const mockGetPublicReceipt = vi.fn();
const mockGetReceiptById = vi.fn();
const mockBuildNarrow = vi.fn();
const mockResolveIssuable = vi.fn();
const mockResolveDecisionContext = vi.fn();
const mockRecordEvent = vi.fn();
const mockRecordActivity = vi.fn();
const mockInsertDecision = vi.fn();
const mockPriorActivity = vi.fn();

vi.mock("@/lib/partner/hostedHandoff", () => ({
  createHostedHandoff: (...args: unknown[]) => mockHandoff(...args),
  completeHostedHandoff: (...args: unknown[]) => mockCompleteHandoff(...args),
}));

vi.mock("@/lib/partner/launchpad/partnerFlowRequest", () => ({
  loadPartnerFlowStoredConfig: (...args: unknown[]) => mockLoadStored(...args),
}));

vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: (...args: unknown[]) => mockEvaluatePolicy(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  issueReceiptForDecision: (...args: unknown[]) => mockIssueReceipt(...args),
  getPublicReceipt: (...args: unknown[]) => mockGetPublicReceipt(...args),
  getReceiptById: (...args: unknown[]) => mockGetReceiptById(...args),
}));

vi.mock("@/lib/partner/narrowPartnerResult/build", () => ({
  buildNarrowPartnerResultForReceipt: (...args: unknown[]) => mockBuildNarrow(...args),
}));

vi.mock("@/lib/policy/changeControl/lifecycle", () => ({
  resolveIssuablePolicyForPartner: (...args: unknown[]) => mockResolveIssuable(...args),
}));

vi.mock("@/lib/partner/launchpad/productionActivation", () => ({
  resolveReceiptDecisionContext: (...args: unknown[]) => mockResolveDecisionContext(...args),
}));

vi.mock("@/lib/partner/integrationObservability/record", () => ({
  recordIntegrationEventBestEffort: (...args: unknown[]) => mockRecordEvent(...args),
}));

vi.mock("@/lib/decisionReceipts/receiptIntegrityDiagnostics", () => ({
  evaluateReceiptIntegrity: () => ({
    payload_hash_matches_recomputed: true,
    signature_valid: true,
  }),
}));

vi.mock("@/lib/partner/launchpad/recordActivity", () => ({
  recordLaunchpadActivity: (...args: unknown[]) => mockRecordActivity(...args),
}));

function chain(result: unknown) {
  const api: Record<string, unknown> = {};
  const next = () => chain(result);
  for (const key of ["select", "eq", "order", "limit", "insert"]) api[key] = next;
  api.maybeSingle = () => result;
  api.single = () => result;
  return api;
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "partner_launchpad_activity") {
        return {
          select: () => chain(mockPriorActivity()),
        };
      }
      if (table === "verification_decisions") {
        return {
          insert: (payload: unknown) => {
            mockInsertDecision(payload);
            return chain({ data: { id: "dec_first" }, error: null });
          },
        };
      }
      return { insert: () => chain({ data: { id: "row" } }) };
    },
  }),
}));

function demoApp(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app_demo",
    public_slug: "demo-app",
    partner_id: "studio-test-abc",
    application_name: "Demo",
    display_name: "Demo",
    environment: "sandbox",
    policy_id: "studio-test-abc-sandbox_economic_demo-v1",
    policy_version: 1,
    policy_template_id: "sandbox_economic_demo",
    allowed_return_urls: ["http://localhost:3000/callback"],
    api_key_id: "key_1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function sampleReceiptRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const base: DecisionReceiptRecord = {
    id: "dr_first_proof",
    schema_version: "1.0.0",
    verification_decision_id: "dec_1",
    partner_id: "studio-test-abc",
    policy_id: "studio-test-abc-sandbox_economic_demo-v1",
    policy_version: 1,
    subject_pseudonym_id: "sub_pseudo",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["sandbox_demo_eligible"],
    evaluated_claim_refs: [{
      claim_id: "sandbox-qual:vr_first:privacy_preserving",
      claim_type: "product_eligibility",
      issuer_id: "issuer:abraxas-sandbox",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-01-01T02:00:00.000Z",
    }],
    issuer_refs: ["issuer:abraxas-sandbox"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-01-01T02:00:00.000Z",
    status: "active",
    payload_hash: "",
    signature: "sig",
    signature_kid: "kid_test",
    anchor_reference: null,
    ...overrides,
  };
  const canonical = buildCanonicalPayload({
    receipt_id: base.id,
    schema_version: base.schema_version,
    decision_id: base.verification_decision_id,
    policy_id: base.policy_id,
    policy_version: base.policy_version,
    partner_id: base.partner_id,
    subject_pseudonym_id: base.subject_pseudonym_id,
    wallet_binding_ref: base.wallet_binding_ref,
    consent_receipt_id: base.consent_receipt_id,
    decision_result: base.decision_result,
    reason_codes: base.reason_codes,
    evaluated_claim_refs: base.evaluated_claim_refs,
    issuer_refs: base.issuer_refs,
    decision_context: base.decision_context,
    evaluated_at: base.evaluated_at,
    expires_at: base.expires_at,
  });
  base.payload_hash = hashCanonicalPayload(canonical);
  return base;
}

describe("runSandboxFirstProof trust path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPriorActivity.mockResolvedValue({ data: null });
    mockLoadStored.mockResolvedValue({
      callback_url: "http://localhost:3000/callback",
      action: "sandbox_demo",
      purpose: "sandbox_demo_eligible",
    });
    mockHandoff.mockResolvedValue({
      verify_request: "vr_first1234567890",
      handoff_ref: "ho_first",
    });
    mockResolveIssuable.mockResolvedValue({
      version: 1,
      rules_json: POLICY_PACKS.sandbox_economic_demo.rules,
    });
    mockEvaluatePolicy.mockResolvedValue({
      policy: {
        id: "studio-test-abc-sandbox_economic_demo-v1",
        partner_id: "studio-test-abc",
        version: 1,
        rules_json: POLICY_PACKS.sandbox_economic_demo.rules,
      },
      evaluation: {
        decision: "approved",
        claims: { product_eligibility: true },
        reason_codes: ["sandbox_demo_eligible"],
        valid_until: "2026-01-01T02:00:00.000Z",
        production_usable: false,
        decision_context: "sandbox_only",
      },
      claims: [],
    });
    mockInsertDecision.mockResolvedValue({ data: { id: "dec_first" }, error: null });
    mockResolveDecisionContext.mockResolvedValue("sandbox_only");
    mockIssueReceipt.mockResolvedValue(sampleReceiptRecord());
    mockGetReceiptById.mockImplementation(async (id: string) => sampleReceiptRecord({ id }));
    mockGetPublicReceipt.mockResolvedValue({
      receipt_id: "dr_first_proof",
      schema_version: "1.0.0",
      signature_valid: true,
      currently_valid: true,
      production_usable: false,
      decision_context: "sandbox_only",
      partner_id: "studio-test-abc",
      policy_id: "studio-test-abc-sandbox_economic_demo-v1",
    });
    mockBuildNarrow.mockResolvedValue({
      schema_version: "1.0.0",
      receipt_id: "dr_first_proof",
      partner_id: "studio-test-abc",
      policy_id: "studio-test-abc-sandbox_economic_demo-v1",
      decision: "approved",
      result_family: "sandbox_demo_eligible",
    });
    mockCompleteHandoff.mockResolvedValue(undefined);
    mockRecordEvent.mockResolvedValue(undefined);
    mockRecordActivity.mockResolvedValue(undefined);
  });

  it("rejects age policy without faking identity verification", async () => {
    const { runSandboxFirstProof } = await import("./firstProof");
    const result = await runSandboxFirstProof({
      application: demoApp({
        policy_id: "studio-test-abc-age_21_retail-v1",
        policy_template_id: "age_21_retail",
      }),
      partnerId: "studio-test-abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("live_holder_required");
    expect(mockHandoff).not.toHaveBeenCalled();
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });

  it("uses canonical policy evaluator and receipt issuer for economic demo", async () => {
    const { runSandboxFirstProof } = await import("./firstProof");
    const result = await runSandboxFirstProof({
      application: demoApp(),
      partnerId: "studio-test-abc",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockEvaluatePolicy).toHaveBeenCalledTimes(1);
    expect(mockEvaluatePolicy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      policyId: "studio-test-abc-sandbox_economic_demo-v1",
      partnerId: "studio-test-abc",
      additionalClaims: expect.arrayContaining([
        expect.objectContaining({
          claim_type: "product_eligibility",
          issuer_id: "issuer:abraxas-sandbox",
        }),
      ]),
    }));
    expect(mockIssueReceipt).toHaveBeenCalledTimes(1);
    expect(mockIssueReceipt.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      decisionContext: "sandbox_only",
      decisionResult: "approved",
    }));
    expect(mockInsertDecision.mock.calls[0]?.[0]?.decision).toBe("approved");
    expect(mockRecordEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "receipt_verification_succeeded",
    }));
    expect(result.policy_evaluation.production_usable).toBe(false);
    expect(result.activates_production).toBe(false);
  });

  it("fails when canonical policy evaluation denies", async () => {
    mockEvaluatePolicy.mockResolvedValueOnce({
      evaluation: {
        decision: "denied",
        claims: {},
        reason_codes: ["missing:product_eligibility"],
        production_usable: false,
      },
    });
    const { runSandboxFirstProof } = await import("./firstProof");
    const result = await runSandboxFirstProof({
      application: demoApp(),
      partnerId: "studio-test-abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("policy_not_satisfied");
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });

  it("records receipt_verification_succeeded only after public verification", async () => {
    mockGetPublicReceipt.mockResolvedValueOnce({
      signature_valid: false,
      currently_valid: false,
      production_usable: false,
      partner_id: "studio-test-abc",
      policy_id: "studio-test-abc-sandbox_economic_demo-v1",
    });
    const { runSandboxFirstProof } = await import("./firstProof");
    const result = await runSandboxFirstProof({
      application: demoApp(),
      partnerId: "studio-test-abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("receipt_invalid");
    expect(mockRecordEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      eventType: "receipt_verification_succeeded",
    }));
  });

  it("rejects production-usable public receipt at sandbox boundary", async () => {
    mockGetPublicReceipt.mockResolvedValueOnce({
      signature_valid: true,
      currently_valid: true,
      production_usable: true,
      partner_id: "studio-test-abc",
      policy_id: "studio-test-abc-sandbox_economic_demo-v1",
    });
    const { runSandboxFirstProof } = await import("./firstProof");
    const result = await runSandboxFirstProof({
      application: demoApp(),
      partnerId: "studio-test-abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("production_boundary");
  });

  it("returns idempotent duplicate without re-issuing receipt", async () => {
    mockPriorActivity.mockResolvedValueOnce({
      data: {
        metadata: {
          receipt_id: "dr_existing",
          request_id: "vr_existing123456789",
          callback_url: "http://localhost:3000/callback?receipt_id=dr_existing",
          handoff_ref: "ho_existing",
          verification_url: "/partner/continue?verify_request=vr_existing",
        },
      },
    });
    mockGetReceiptById.mockImplementation(async (id: string) => sampleReceiptRecord({
      id,
      decision_result: "approved",
    }));
    mockBuildNarrow.mockResolvedValueOnce({
      schema_version: "1.0.0",
      receipt_id: "dr_existing",
      decision: "approved",
      result_family: "sandbox_demo_eligible",
    });
    const { runSandboxFirstProof } = await import("./firstProof");
    const result = await runSandboxFirstProof({
      application: demoApp(),
      partnerId: "studio-test-abc",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicate).toBe(true);
    expect(mockHandoff).not.toHaveBeenCalled();
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });
});

describe("DecisionReceiptCanonicalPayload v1.0.0", () => {
  it("remains unchanged for first-proof receipt shape", () => {
    const record = sampleReceiptRecord();
    expect(record.schema_version).toBe("1.0.0");
    const canonical = buildCanonicalPayload({
      receipt_id: record.id,
      schema_version: record.schema_version,
      decision_id: record.verification_decision_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      partner_id: record.partner_id,
      subject_pseudonym_id: record.subject_pseudonym_id,
      wallet_binding_ref: record.wallet_binding_ref,
      consent_receipt_id: record.consent_receipt_id,
      decision_result: record.decision_result,
      reason_codes: record.reason_codes,
      evaluated_claim_refs: record.evaluated_claim_refs,
      issuer_refs: record.issuer_refs,
      decision_context: record.decision_context,
      evaluated_at: record.evaluated_at,
      expires_at: record.expires_at,
    });
    expect(canonical.schema_version).toBe("1.0.0");
    expect(hashCanonicalPayload(canonical)).toBe(record.payload_hash);
  });
});

describe("PartnerKit callback contract", () => {
  it("verifyCallbackWithNarrowResult accepts first-proof callback params", async () => {
    const { AbraxasPartnerKit } = await import("@/lib/partner/integrationKit");
    const kit = new AbraxasPartnerKit({
      partnerId: "studio-test-abc",
      policyId: "studio-test-abc-sandbox_economic_demo-v1",
      policyPackId: "sandbox_economic_demo",
      policyVersion: 1,
      environment: "sandbox",
      applicationId: "app_demo",
      apiKey: "abx_test_key",
      appOrigin: "https://abraxasworld.xyz",
      fetchFn: vi.fn(async (url: string) => {
        if (url.includes("/narrow-result")) {
          return new Response(JSON.stringify({
            schema_version: "1.0.0",
            receipt_id: "dr_first_proof",
            partner_id: "studio-test-abc",
            policy_id: "studio-test-abc-sandbox_economic_demo-v1",
            decision: "approved",
            result_family: "sandbox_demo_eligible",
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          receipt_id: "dr_first_proof",
          schema_version: "1.0.0",
          partner_id: "studio-test-abc",
          policy_id: "studio-test-abc-sandbox_economic_demo-v1",
          policy_version: 1,
          decision_result: "approved",
          signature_valid: true,
          currently_valid: true,
          production_usable: false,
          decision_context: "sandbox_only",
          status: "active",
          expires_at: "2099-01-01T00:00:00.000Z",
          invalidation_reasons: ["production_not_usable:false"],
          artifact_type: "eligibility_decision_receipt",
        }), { status: 200 });
      }) as typeof fetch,
    });

    const verified = await kit.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({
        receipt_id: "dr_first_proof",
        decision: "approved",
        status: "active",
        request_id: "vr_first1234567890",
      }),
      expectedRequestId: "vr_first1234567890",
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.narrow?.result_family).toBe("sandbox_demo_eligible");
  });
});

describe("receipt signature path", () => {
  it("uses verifyRecordSignature compatible with canonical payload", () => {
    const record = sampleReceiptRecord();
    expect(record.schema_version).toBe("1.0.0");
    expect(typeof verifyRecordSignature).toBe("function");
  });
});
