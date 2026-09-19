import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPeek = vi.fn();
const mockRequireSession = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireSession(...args),
}));

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeek(...args),
  }),
}));

import { GET, POST } from "./route";
import {
  PARTNER_CONTINUE_BINDING_COOKIE,
  signPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

const STORED = {
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
};

describe("method-qualification routes", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
    mockPeek.mockReset();
    mockPeek.mockResolvedValue(STORED);
    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0xabc" },
    });
  });

  it("GET is not qualified before a successful method completion", async () => {
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: "vr-sandbox-1" });
    const req = new NextRequest(
      "http://localhost/api/v1/partner-verify/method-qualification?verify_request=vr-sandbox-1",
    );
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      method_qualified: false,
      issuedReceipt: false,
    });
  });

  it("POST qualifies the sandbox method without issuing a receipt", async () => {
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: "vr-sandbox-1" });
    const req = new NextRequest("http://localhost/api/v1/partner-verify/method-qualification", {
      method: "POST",
      body: JSON.stringify({
        verify_request: "vr-sandbox-1",
        method_id: "privacy_preserving",
      }),
    });
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      method_selected: true,
      method_qualified: true,
      issuedReceipt: false,
      sandbox_only: true,
    });
    expect(res.headers.get("set-cookie") ?? "").toMatch(/abraxas_partner_method_qualification=/);
  });

  it("POST rejects sandbox evidence for an authoritative continuation", async () => {
    mockPeek.mockResolvedValue({
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      policyVersion: 2,
    });
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: "vr-retail-1" });
    const req = new NextRequest("http://localhost/api/v1/partner-verify/method-qualification", {
      method: "POST",
      body: JSON.stringify({
        verify_request: "vr-retail-1",
        method_id: "privacy_preserving",
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
      }),
    });
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      method_qualified: false,
      issuedReceipt: false,
      code: "sandbox_evidence_rejected",
    });
  });

  it("POST rejects claimed partner/policy that do not match the stored continuation", async () => {
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: "vr-sandbox-1" });
    const req = new NextRequest("http://localhost/api/v1/partner-verify/method-qualification", {
      method: "POST",
      body: JSON.stringify({
        verify_request: "vr-sandbox-1",
        method_id: "privacy_preserving",
        partner_id: "attacker",
        policy_id: "good-trouble-retail-v1",
      }),
    });
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: "cross_partner",
      method_qualified: false,
      issuedReceipt: false,
    });
  });
});
