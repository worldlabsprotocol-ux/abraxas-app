import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const GOOD_TROUBLE_PARTNER = "good-trouble";
const GOOD_TROUBLE_POLICY = "good-trouble-age_21_retail-v1";
const OPAQUE = "vr_gt_share_test001";
const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const loadHandoffMock = vi.fn();
const bindReceiptMock = vi.fn();
const requireQualifiedMock = vi.fn();
const evaluatePolicyMock = vi.fn();
const findByIdempotencyMock = vi.fn();
const issueReceiptMock = vi.fn();
const getReceiptByDecisionMock = vi.fn();
const getPolicyMock = vi.fn();
const insertDecisionMock = vi.fn();
const insertConsentMock = vi.fn();
const selectDecisionMock = vi.fn();

vi.mock("@/lib/partner/goodTroublePurchaseFlow", () => ({
  isCanonicalGoodTroublePurchaseFlow: vi.fn(() => true),
}));

vi.mock("@/lib/partner/sandboxQualificationClaims", () => ({
  deriveServerSandboxQualificationClaims: vi.fn(() => []),
}));

vi.mock("@/lib/passport/reusableEligibility/qualify", () => ({
  resolveCompatibleReusableFact: vi.fn(async () => ({ ok: false, state: "none" })),
}));

vi.mock("@/lib/passport/reusableEligibility/issue", () => ({
  derivedClaimRefs: vi.fn(() => []),
  derivedReasonCodes: vi.fn(() => []),
  persistReuseDerivation: vi.fn(async () => undefined),
}));

vi.mock("@/lib/passport/reusableEligibility/observability", () => ({
  recordEvidenceReuseTelemetry: vi.fn(async () => undefined),
}));

vi.mock("@/lib/partner/hostedHandoff/store", () => ({
  loadHandoffByVerifyRequest: (...args: unknown[]) => loadHandoffMock(...args),
  bindHandoffToIssuedReceipt: (...args: unknown[]) => bindReceiptMock(...args),
}));

vi.mock("@/lib/partner/requirePartnerMethodQualification", () => ({
  requireQualifiedPartnerMethod: (...args: unknown[]) => requireQualifiedMock(...args),
}));

vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: (...args: unknown[]) => evaluatePolicyMock(...args),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findDecisionByIdempotencyKey: (...args: unknown[]) => findByIdempotencyMock(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  issueReceiptForDecision: (...args: unknown[]) => issueReceiptMock(...args),
  getReceiptByDecisionId: (...args: unknown[]) => getReceiptByDecisionMock(...args),
}));

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => getPolicyMock(...args),
}));

vi.mock("@/lib/partner/launchpad/productionActivation", () => ({
  resolveReceiptDecisionContext: vi.fn(async () => "sandbox_only"),
}));

vi.mock("@/lib/partner/verificationDecisionsSchema", () => ({
  isVerificationDecisionIdempotencyKeyAvailable: vi.fn(async () => true),
  isMissingIdempotencyKeyColumnError: vi.fn(() => false),
  markVerificationDecisionIdempotencyKeyAbsent: vi.fn(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/partner/partnerFlowAudit", () => ({
  flowTraceIdFromVerificationRequest: (id: string) => `ft_vr_${id}`,
  auditPartnerFlowStepBestEffort: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "verification_decisions") {
        return {
          insert: () => ({
            select: () => ({
              single: () => insertDecisionMock(),
            }),
          }),
          select: () => ({
            eq: () => ({
              maybeSingle: () => selectDecisionMock(),
            }),
          }),
        };
      }
      if (table === "consent_receipts") {
        return {
          insert: () => ({
            select: () => ({
              single: () => insertConsentMock(),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

function stubHandoff(overrides: Record<string, unknown> = {}) {
  return {
    id: "ho-1",
    handoff_ref: "ho_ref_1",
    verify_request: OPAQUE,
    application_id: "690d0c89-7b98-4946-8ad2-7469f5ca89d9",
    partner_id: GOOD_TROUBLE_PARTNER,
    policy_id: GOOD_TROUBLE_POLICY,
    policy_version: 2,
    binding_id: null,
    pack_id: null,
    result_family: "age_eligible_21",
    action: "purchase",
    purpose: "purchase",
    callback_ref: "cb-1",
    runtime: "wix_velo",
    environment: "sandbox",
    status: "created",
    nonce_hash: "hash",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 900_000).toISOString(),
    consumed_at: null,
    public_receipt_id: null,
    fixture: false,
    ...overrides,
  };
}

describe("consentOpaqueHostedHandoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdempotencyMock.mockResolvedValue(null);
    loadHandoffMock.mockResolvedValue(stubHandoff());
    requireQualifiedMock.mockResolvedValue({
      ok: true,
      record: {
        verifyRequestId: OPAQUE,
        partnerId: GOOD_TROUBLE_PARTNER,
        policyId: GOOD_TROUBLE_POLICY,
        policyVersion: 2,
        methodId: "self_attestation",
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: true,
      },
    });
    getPolicyMock.mockResolvedValue({
      id: GOOD_TROUBLE_POLICY,
      partner_id: GOOD_TROUBLE_PARTNER,
      version: 2,
      status: "active",
      effective_at: new Date().toISOString(),
      rules_json: { age_eligibility_only: true, minimum_assurance_cap: "L0" },
    });
    evaluatePolicyMock.mockResolvedValue({
      policy: {
        id: GOOD_TROUBLE_POLICY,
        partner_id: GOOD_TROUBLE_PARTNER,
        version: 2,
        rules_json: { age_eligibility_only: true },
      },
      evaluation: {
        decision: "approved",
        claims: { over_21: true },
        reason_codes: [],
        valid_until: new Date(Date.now() + 86_400_000).toISOString(),
      },
      claims: [],
    });
    insertDecisionMock.mockResolvedValue({ data: { id: "dec-1" }, error: null });
    insertConsentMock.mockResolvedValue({ data: { id: "consent-1" }, error: null });
    issueReceiptMock.mockResolvedValue({ id: "dr_gt_1" });
    bindReceiptMock.mockResolvedValue(undefined);
  });

  it("issues a sandbox receipt for an active opaque handoff after qualification", async () => {
    const { consentOpaqueHostedHandoff } = await import("./consentAndIssueReceipt");
    const result = await consentOpaqueHostedHandoff({
      verifyRequest: OPAQUE,
      suiAddress: SUBJECT,
      request: new NextRequest("http://localhost"),
    });
    expect(result.receipt_id).toBe("dr_gt_1");
    expect(result.decision).toBe("approved");
    expect(bindReceiptMock).toHaveBeenCalledWith(expect.objectContaining({
      verifyRequest: OPAQUE,
      publicReceiptId: "dr_gt_1",
    }));
  });

  it("returns idempotent replay without re-issuing", async () => {
    findByIdempotencyMock.mockResolvedValue({
      decision_id: "dec-existing",
      partner_id: GOOD_TROUBLE_PARTNER,
      subject_id: SUBJECT,
      policy_id: GOOD_TROUBLE_POLICY,
      request_id: null,
      idempotency_key: `pf_vr:${OPAQUE}`,
      valid_until: new Date(Date.now() + 60_000).toISOString(),
    });
    getReceiptByDecisionMock.mockResolvedValue({ id: "dr_existing" });
    selectDecisionMock.mockResolvedValue({
      data: {
        decision: "approved",
        claims_json: { over_21: true },
        reason_codes: [],
        valid_until: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const { consentOpaqueHostedHandoff } = await import("./consentAndIssueReceipt");
    const result = await consentOpaqueHostedHandoff({
      verifyRequest: OPAQUE,
      suiAddress: SUBJECT,
      request: new NextRequest("http://localhost"),
    });
    expect(result.idempotent_replay).toBe(true);
    expect(result.receipt_id).toBe("dr_existing");
    expect(issueReceiptMock).not.toHaveBeenCalled();
  });

  it("rejects expired handoffs", async () => {
    loadHandoffMock.mockResolvedValue(stubHandoff({
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    }));
    const { consentOpaqueHostedHandoff, HostedHandoffConsentError } = await import("./consentAndIssueReceipt");
    await expect(consentOpaqueHostedHandoff({
      verifyRequest: OPAQUE,
      suiAddress: SUBJECT,
      request: new NextRequest("http://localhost"),
    })).rejects.toBeInstanceOf(HostedHandoffConsentError);
  });

  it("rejects missing qualification", async () => {
    requireQualifiedMock.mockResolvedValue({ ok: false, code: "method_not_qualified" });
    const { consentOpaqueHostedHandoff, HostedHandoffConsentError } = await import("./consentAndIssueReceipt");
    await expect(consentOpaqueHostedHandoff({
      verifyRequest: OPAQUE,
      suiAddress: SUBJECT,
      request: new NextRequest("http://localhost"),
    })).rejects.toMatchObject({ code: "method_not_qualified" });
  });

  it("rejects wrong policy version pin", async () => {
    getPolicyMock.mockResolvedValue({
      id: GOOD_TROUBLE_POLICY,
      partner_id: GOOD_TROUBLE_PARTNER,
      version: 1,
      status: "active",
      effective_at: new Date().toISOString(),
      rules_json: { age_eligibility_only: true },
    });
    const { consentOpaqueHostedHandoff, HostedHandoffConsentError } = await import("./consentAndIssueReceipt");
    await expect(consentOpaqueHostedHandoff({
      verifyRequest: OPAQUE,
      suiAddress: SUBJECT,
      request: new NextRequest("http://localhost"),
    })).rejects.toMatchObject({ code: "policy_version_mismatched" });
  });
});
