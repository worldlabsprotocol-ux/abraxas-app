import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { evaluateMethodQualification } from "./partnerMethodQualification";
import { deriveServerSandboxQualificationClaims } from "./sandboxQualificationClaims";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { POLICY_PACKS } from "./launchpad/policyPacks";
import { isInadequateCircleSettlementReceipt } from "./eligibilityMethods";
import { PARTNER_CONTINUE_BINDING_COOKIE, signPartnerContinueBindingCookie } from "./partnerVerifyResumeCookie";
import {
  PARTNER_METHOD_QUALIFICATION_COOKIE,
  signPartnerMethodQualificationCookie,
} from "./partnerMethodQualificationCookie";

const mockPeek = vi.fn();
const mockGetActiveClaims = vi.fn();
const mockGetPolicy = vi.fn();
const mockIssueReceipt = vi.fn();
const mockInsertDecision = vi.fn();
const mockInsertConsent = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdateMaybeSingle = vi.fn();
const mockAppBinding = vi.fn();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeek(...args),
  }),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: (...args: unknown[]) => mockGetActiveClaims(...args),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: (...args: unknown[]) => mockGetPolicy(...args),
  getPartnerPolicyAtVersion: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("@/lib/trust/loadPolicyTrustContext", () => ({
  loadPolicyTrustContext: vi.fn(async () => ({
    jurisdiction: undefined,
    partnerId: "circle-arc-demo-304",
    policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
    trustRulesByClaimType: new Map(),
  })),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  issueReceiptForDecision: (...args: unknown[]) => mockIssueReceipt(...args),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(),
}));

vi.mock("@/lib/partner/partnerFlowAudit", () => ({
  auditPartnerFlowStepBestEffort: vi.fn(),
  flowTraceIdFromVerificationRequest: () => "trace",
}));

function chain(result: unknown) {
  const api: Record<string, unknown> = {};
  const next = () => chain(result);
  for (const key of ["select", "eq", "update", "insert"]) api[key] = next;
  api.maybeSingle = () => result;
  api.single = () => result;
  return api;
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "partner_launchpad_applications") return {
        select: () => chain(mockAppBinding()),
      };
      if (table === "verification_requests") {
        return {
          select: () => chain(mockMaybeSingle()),
          update: () => chain(mockUpdateMaybeSingle()),
        };
      }
      if (table === "consent_receipts") return { insert: () => chain(mockInsertConsent()) };
      if (table === "verification_decisions") return { insert: () => chain(mockInsertDecision()) };
      return { insert: () => chain({ data: { id: "row" } }), update: () => chain({ data: { id: "row" } }) };
    },
  }),
}));

const POLICY = {
  id: "circle-arc-demo-304-sandbox_economic_demo-v1",
  partner_id: "circle-arc-demo-304",
  version: 1,
  name: "Sandbox economic demo",
  status: "active" as const,
  rules_json: POLICY_PACKS.sandbox_economic_demo.rules,
};

const REQUEST_ROW = {
  id: "vr-sandbox-e2e",
  status: "pending",
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  subject_id: "abx_hs_0123456789abcdef0123456789abcdef",
  sui_address: null,
  partner_id: POLICY.partner_id,
  policy_id: POLICY.id,
  policy_version: 1,
  launchpad_application_id: "00000000-0000-4000-8000-000000000001",
  requested_action: "sandbox_economic_demo",
};

describe("sign-in → qualify → consent → sandbox receipt", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
    mockPeek.mockReset();
    mockIssueReceipt.mockReset();
    mockGetActiveClaims.mockResolvedValue([]);
    mockGetPolicy.mockResolvedValue(POLICY);
    mockIssueReceipt.mockResolvedValue({ id: "receipt-sandbox", decision_context: "sandbox_only" });
    mockInsertConsent.mockResolvedValue({ data: { id: "consent-row" } });
    mockInsertDecision.mockResolvedValue({ data: { id: "decision-row" } });
    mockMaybeSingle.mockResolvedValue({ data: REQUEST_ROW });
    mockAppBinding.mockReturnValue({ data: {
      partner_id: POLICY.partner_id, policy_id: POLICY.id,
      policy_version: POLICY.version, status: "active",
    }, error: null });
    mockUpdateMaybeSingle.mockResolvedValue({ data: REQUEST_ROW, error: null });
    mockPeek.mockResolvedValue({
      partnerId: POLICY.partner_id,
      policyId: POLICY.id,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      consumedAt: new Date().toISOString(),
    });
  });

  it("rejects another wallet's subject before qualification or issuance", async () => {
    const { consentAndDecide } = await import("@/lib/verification/requestsService");
    await expect(consentAndDecide({
      requestId: REQUEST_ROW.id,
      subjectId: "abx_hs_ffffffffffffffffffffffffffffffff",
    })).rejects.toThrow("different Passport");
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  }, 15000);

  it("rejects a request without a pinned policy version", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...REQUEST_ROW, policy_version: null } });
    const { consentAndDecide } = await import("@/lib/verification/requestsService");
    await expect(consentAndDecide({
      requestId: REQUEST_ROW.id,
      subjectId: REQUEST_ROW.subject_id,
    })).rejects.toThrow("policy version unavailable");
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });

  it("rejects a changed application policy before issuance", async () => {
    mockAppBinding.mockReturnValue({ data: {
      partner_id: POLICY.partner_id, policy_id: POLICY.id,
      policy_version: 2, status: "active",
    }, error: null });
    const { consentAndDecide } = await import("@/lib/verification/requestsService");
    await expect(consentAndDecide({
      requestId: REQUEST_ROW.id,
      subjectId: REQUEST_ROW.subject_id,
    })).rejects.toThrow("application_policy_binding_changed");
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });

  it("issues one sandbox-only receipt after qualification and consent, and denies otherwise", async () => {
    const qualified = evaluateMethodQualification({
      methodId: "privacy_preserving",
      storedPartnerId: POLICY.partner_id,
      storedPolicyId: POLICY.id,
      storedPolicyVersion: 1,
      verifyRequestId: REQUEST_ROW.id,
    });
    expect(qualified.ok).toBe(true);
    if (!qualified.ok) return;
    expect(qualified.record.issuedReceipt).toBe(false);

    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: REQUEST_ROW.id });
    const cookie = await signPartnerMethodQualificationCookie(qualified.record);
    const req = new NextRequest("http://localhost/consent", { method: "POST" });
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    req.cookies.set(PARTNER_METHOD_QUALIFICATION_COOKIE, cookie!);

    const { consentAndDecide } = await import("@/lib/verification/requestsService");
    const permitted = await consentAndDecide({
      requestId: REQUEST_ROW.id,
      subjectId: REQUEST_ROW.subject_id,
      request: req,
    });
    expect(permitted.decision).toBe("approved");
    expect(permitted.receipt_id).toBe("receipt-sandbox");
    expect(mockIssueReceipt).toHaveBeenCalledTimes(1);
    expect(mockIssueReceipt.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      decisionResult: "approved",
      decisionContext: "sandbox_only",
      policyId: POLICY.id,
      partnerId: POLICY.partner_id,
    }));
    expect(isInadequateCircleSettlementReceipt({
      policy_id: POLICY.id,
      production_usable: false,
      decision_context: "sandbox_only",
      evaluated_claim_refs: [{ claim_type: "product_eligibility", issuer_id: "issuer:abraxas-sandbox" }],
    }).inadequate).toBe(false);

    mockIssueReceipt.mockClear();
    const deniedNoQual = evaluatePolicyRules(POLICY.rules_json, []);
    expect(deniedNoQual.decision).toBe("denied");

    const stale = deriveServerSandboxQualificationClaims({
      record: qualified.record,
      subjectId: "0xabc",
      storedPartnerId: POLICY.partner_id,
      storedPolicyId: "good-trouble-retail-v1",
    });
    expect(stale).toEqual([]);
    const authoritative = evaluatePolicyRules(POLICY_PACKS.age_21_retail.rules, deriveServerSandboxQualificationClaims({
      record: qualified.record,
      subjectId: "0xabc",
      storedPartnerId: POLICY.partner_id,
      storedPolicyId: POLICY.id,
      storedPolicyVersion: 1,
    }));
    expect(authoritative.decision).toBe("denied");
  });
});
