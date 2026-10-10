import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://merchant.example/auth/abraxas/callback";
const PARTNER_ID = "example-merchant-protocol";
const POLICY_ID = "example-merchant-age-21-v1";
const WRONG_PARTNER = "other-partner";
const WRONG_POLICY = "other-policy-v1";

const requireBrowserSession = vi.fn();
const isAllowedPartnerReturnUrl = vi.fn();
const normalizePartnerVerifyWithLaunchpad = vi.fn();
const evaluatePartnerFlow = vi.fn();
const appendAuditEvent = vi.fn(async () => "audit-1");

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSession(...args),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: (...args: unknown[]) => isAllowedPartnerReturnUrl(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadVerifyInput", () => ({
  normalizePartnerVerifyWithLaunchpad: (...args: unknown[]) => normalizePartnerVerifyWithLaunchpad(...args),
}));

vi.mock("@/lib/partner/relyingPartyFlow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/relyingPartyFlow")>();
  return {
    ...actual,
    evaluatePartnerFlow: (...args: unknown[]) => evaluatePartnerFlow(...args),
  };
});

vi.mock("@/lib/partner/partnerFlowRouteGuard", () => ({
  enforcePartnerFlowRateLimit: vi.fn(async () => null),
  recordPartnerFlowRequestOutcome: vi.fn(),
}));

vi.mock("@/lib/partner/launchpad/resolvePinnedPolicyVersion", () => ({
  resolveLaunchpadPinnedPolicyVersion: vi.fn(async () => 1),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (input: unknown) => appendAuditEvent(input),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({
  logPartnerUsage: vi.fn(),
}));

function postJson(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("partner-flow evaluate route security boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireBrowserSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUI },
    });
    normalizePartnerVerifyWithLaunchpad.mockResolvedValue({
      ok: true,
      params: {
        partnerId: PARTNER_ID,
        policyId: POLICY_ID,
        returnUrl: RETURN_URL,
        permission: undefined,
        permissionVersion: undefined,
        purpose: undefined,
      },
      launchpad: undefined,
    });
    isAllowedPartnerReturnUrl.mockResolvedValue(true);
    evaluatePartnerFlow.mockResolvedValue({
      next: "passport",
      verification_request_id: "00000000-0000-4000-8000-0000000000aa",
    });
    appendAuditEvent.mockResolvedValue("audit-1");
  });

  it("returns 401 when browser session is missing", async () => {
    requireBrowserSession.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Sign in required",
    });
    const res = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));
    expect(res.status).toBe(401);
    expect(evaluatePartnerFlow).not.toHaveBeenCalled();
  });

  it("returns 400 when return_url is not allowlisted", async () => {
    isAllowedPartnerReturnUrl.mockResolvedValueOnce(false);
    const res = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: "https://evil.example/steal",
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "return_url is not allowed for this relying party",
    });
    expect(evaluatePartnerFlow).not.toHaveBeenCalled();
  });

  it("returns 400 when verify normalization fails (wrong tuple)", async () => {
    normalizePartnerVerifyWithLaunchpad.mockResolvedValueOnce({
      ok: false,
      code: "invalid_partner_policy",
      invalidLinkMessage: "Unknown policy for partner",
    });
    const res = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", {
      partner_id: WRONG_PARTNER,
      policy_id: WRONG_POLICY,
      return_url: RETURN_URL,
    }));
    expect(res.status).toBe(400);
    expect(evaluatePartnerFlow).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await evaluatePOST(new NextRequest("http://localhost/api/v1/partner-flow/evaluate", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(400);
    expect(evaluatePartnerFlow).not.toHaveBeenCalled();
  });

  it("does not call evaluate when launchpad normalization rejects environment mismatch", async () => {
    normalizePartnerVerifyWithLaunchpad.mockResolvedValueOnce({
      ok: false,
      code: "environment_mismatch",
      invalidLinkMessage: "Production application cannot evaluate in sandbox mode",
    });
    const res = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      application_id: "00000000-0000-4000-8000-000000000099",
    }));
    expect(res.status).toBe(400);
    expect(evaluatePartnerFlow).not.toHaveBeenCalled();
  });
});
