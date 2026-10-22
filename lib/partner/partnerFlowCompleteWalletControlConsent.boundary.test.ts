import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as completePOST } from "@/app/api/v1/partner-flow/complete/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://abraxas-app.vercel.app/demo/partner-access";
const PARTNER_ID = "studio-wc-demo";
const POLICY_ID = "studio-wc-demo-wallet_control-v1";
const OPAQUE = "vr_testopaque00000001";

const completePartnerFlowAfterApproval = vi.fn();
const enforceWalletControlCompleteAuthorization = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { subjectId: SUI },
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

vi.mock("@/lib/partner/walletControlCompleteAuthorization", () => ({
  walletControlCompleteRequiresAuthorization: (input: { policyId: string; verifyRequestId: string | null }) =>
    input.policyId.includes("wallet_control") && Boolean(input.verifyRequestId),
  enforceWalletControlCompleteAuthorization: (...args: unknown[]) => enforceWalletControlCompleteAuthorization(...args),
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

describe("partner-flow complete wallet-control consent gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completePartnerFlowAfterApproval.mockResolvedValue({
      ok: true,
      next: "enter",
      redirect_url: RETURN_URL,
      partner_result: { decision: "approved", receipt_id: "dr_wc_test", reason_codes: [] },
    });
  });

  it("rejects wallet-control completion without server-side sharing consent", async () => {
    enforceWalletControlCompleteAuthorization.mockResolvedValue({
      ok: false,
      httpStatus: 403,
      code: "sharing_consent_required",
      error: "Explicit holder consent is required before sharing the result.",
    });

    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verify_request: OPAQUE,
    }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe("sharing_consent_required");
    expect(completePartnerFlowAfterApproval).not.toHaveBeenCalled();
  });

  it("rejects wallet-control completion when method is not qualified", async () => {
    enforceWalletControlCompleteAuthorization.mockResolvedValue({
      ok: false,
      httpStatus: 403,
      code: "method_not_qualified",
      error: "Wallet control must be qualified for this request before completion.",
    });

    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verify_request: OPAQUE,
    }));
    expect(res.status).toBe(403);
    expect(completePartnerFlowAfterApproval).not.toHaveBeenCalled();
  });

  it("allows completion when qualification and sharing consent are satisfied", async () => {
    enforceWalletControlCompleteAuthorization.mockResolvedValue({ ok: true });

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
        partnerId: PARTNER_ID,
        policyId: POLICY_ID,
      }),
    );
  });

  it("does not apply wallet-control gate to non-wallet-control policies", async () => {
    const res = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: "good-trouble-retail-v1",
      return_url: RETURN_URL,
      verify_request: OPAQUE,
    }));
    expect(res.status).toBe(200);
    expect(enforceWalletControlCompleteAuthorization).not.toHaveBeenCalled();
  });
});
