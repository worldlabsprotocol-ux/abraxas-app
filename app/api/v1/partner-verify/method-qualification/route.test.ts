import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPeek = vi.fn();
const mockRequireSession = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireSession(...args),
}));

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeek(...args),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  SupabaseAdminConfigurationError: class extends Error {},
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
        }),
      }),
    }),
  }),
}));

import { GET, POST } from "./route";
import {
  PARTNER_CONTINUE_BINDING_COOKIE,
  signPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";
import { PARTNER_METHOD_QUALIFICATION_COOKIE } from "@/lib/partner/partnerMethodQualificationCookie";

const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000abc";
const STORED = {
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  consumedAt: new Date().toISOString(),
};

function vrRow(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      partner_id: STORED.partnerId,
      policy_id: STORED.policyId,
      policy_version: 1,
      sui_address: SUBJECT,
      status: "pending",
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      ...overrides,
    },
    error: null,
  };
}

function cookieMap(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(/,(?=[^;]+=)/)) {
    const [pair] = part.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

describe("method-qualification routes", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
    mockPeek.mockReset();
    mockPeek.mockResolvedValue(STORED);
    mockMaybeSingle.mockResolvedValue(vrRow());
    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUBJECT },
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

  it("GET without a continue-binding cookie does not clear a missing pointer", async () => {
    const req = new NextRequest(
      "http://localhost/api/v1/partner-verify/method-qualification?verify_request=vr-sandbox-1",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ method_qualified: false, issuedReceipt: false });
    expect(res.headers.get("set-cookie") ?? "").not.toMatch(new RegExp(`${PARTNER_CONTINUE_BINDING_COOKIE}=;`));
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

  it("POST qualifies privacy_preserving without a continue-binding cookie, then GET confirms", async () => {
    const postReq = new NextRequest("http://localhost/api/v1/partner-verify/method-qualification", {
      method: "POST",
      body: JSON.stringify({
        verify_request: "vr-sandbox-1",
        method_id: "privacy_preserving",
      }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    expect(await postRes.json()).toMatchObject({
      method_qualified: true,
      issuedReceipt: false,
    });
    const cookies = cookieMap(postRes.headers.get("set-cookie"));
    expect(cookies[PARTNER_METHOD_QUALIFICATION_COOKIE]).toBeTruthy();
    expect(cookies[PARTNER_CONTINUE_BINDING_COOKIE]).toBeTruthy();

    const getReq = new NextRequest(
      "http://localhost/api/v1/partner-verify/method-qualification?verify_request=vr-sandbox-1",
    );
    getReq.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, cookies[PARTNER_CONTINUE_BINDING_COOKIE]);
    getReq.cookies.set(PARTNER_METHOD_QUALIFICATION_COOKIE, cookies[PARTNER_METHOD_QUALIFICATION_COOKIE]);
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toMatchObject({
      method_qualified: true,
      issuedReceipt: false,
    });
  });

  it("POST rejects sandbox evidence for an authoritative continuation", async () => {
    mockPeek.mockResolvedValue({
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      policyVersion: 2,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    });
    mockMaybeSingle.mockResolvedValue(vrRow({
      partner_id: "good-trouble-cannabis",
      policy_id: "good-trouble-retail-v1",
      policy_version: 2,
    }));
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
