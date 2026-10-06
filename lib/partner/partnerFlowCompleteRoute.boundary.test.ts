import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as completePOST } from "@/app/api/v1/partner-flow/complete/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://abraxas-app.vercel.app/demo/partner-access";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";
const CANONICAL_UUID = "00000000-0000-4000-8000-0000000000aa";
const OPAQUE = "vr_testopaque00000001";

const completePartnerFlowAfterApproval = vi.fn();
const findDecisionByVerificationRequest = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: SUI },
  })),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn(async () => true),
}));

vi.mock("@/lib/partner/relyingPartyFlow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/relyingPartyFlow")>();
  return {
    ...actual,
    completePartnerFlowAfterApproval: (...args: unknown[]) => completePartnerFlowAfterApproval(...args),
  };
});

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: vi.fn(async () => null),
  findDecisionByVerificationRequest: (...args: unknown[]) => findDecisionByVerificationRequest(...args),
  findDecisionByIdempotencyKey: vi.fn(async () => null),
  findReceiptForVerificationRequest: vi.fn(async () => null),
  findSessionReceiptForSupersede: vi.fn(async () => null),
  supersedeActiveSessionDecisions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({
  logPartnerUsage: vi.fn(),
}));

vi.mock("@/lib/partner/partnerFlowRouteGuard", () => ({
  enforcePartnerFlowRateLimit: vi.fn(async () => null),
  recordPartnerFlowRequestOutcome: vi.fn(),
}));

vi.mock("@/lib/partner/launchpad/resolvePinnedPolicyVersion", () => ({
  resolveLaunchpadPinnedPolicyVersion: vi.fn(async () => undefined),
}));

vi.mock("@/lib/partner/partnerFlowAudit", () => ({
  auditPartnerFlowReceiptOutcome: vi.fn(async () => undefined),
  auditPartnerFlowStepBestEffort: vi.fn(async () => undefined),
  auditPartnerFlowStepRequired: vi.fn(async () => undefined),
  rejectMismatchedClientFlowTrace: vi.fn(),
  resolvePartnerFlowTraceId: vi.fn(() => "flow_trace_test"),
  FlowTraceMismatchError: class FlowTraceMismatchError extends Error {},
  PartnerFlowAuditPersistenceError: class PartnerFlowAuditPersistenceError extends Error {},
}));

function postJson(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("partner-flow complete opaque token boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completePartnerFlowAfterApproval.mockResolvedValue({
      ok: true,
      next: "enter",
      redirect_url: RETURN_URL,
      partner_result: {
        decision: "approved",
        receipt_id: "dr_hosted",
        reason_codes: [],
      },
    });
  });

  it("rejects opaque vr_* in verification_request_id with 400", async () => {
    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verification_request_id: OPAQUE,
    }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("invalid_verification_request_id");
    expect(completePartnerFlowAfterApproval).not.toHaveBeenCalled();
    expect(findDecisionByVerificationRequest).not.toHaveBeenCalled();
  });

  it("accepts verify_request opaque token and passes correlation to completion", async () => {
    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verify_request: OPAQUE,
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(completePartnerFlowAfterApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationRequestId: OPAQUE,
      }),
    );
    expect(findDecisionByVerificationRequest).not.toHaveBeenCalled();
  });

  it("preserves legacy canonical UUID verification_request_id path", async () => {
    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verification_request_id: CANONICAL_UUID,
    }));
    expect(res.status).toBe(200);
    expect(completePartnerFlowAfterApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationRequestId: CANONICAL_UUID,
      }),
    );
  });

  it("returns typed 500 completion_failed instead of throwing on unexpected completion error", async () => {
    completePartnerFlowAfterApproval.mockRejectedValue(new Error("database cast uuid"));
    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verify_request: OPAQUE,
    }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.code).toBe("completion_failed");
    expect(json.error).not.toContain("database");
  });
});
