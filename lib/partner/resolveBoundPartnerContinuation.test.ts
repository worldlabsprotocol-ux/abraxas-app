import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPeek = vi.fn();
const mockMaybeSingle = vi.fn();

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

import { resolveBoundPartnerContinuation } from "./resolveBoundPartnerContinuation";
import {
  PARTNER_CONTINUE_BINDING_COOKIE,
  signPartnerContinueBindingCookie,
} from "./partnerVerifyResumeCookie";

const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000abc";
const STORED = {
  jti: "jti-1",
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
  returnUrl: "http://localhost:3000/callback/circle-arc-economic-demo-304",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  consumedAt: new Date().toISOString(),
  verifyRequestId: "vr-sandbox-1",
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

describe("resolveBoundPartnerContinuation", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
    mockPeek.mockReset();
    mockMaybeSingle.mockReset();
    mockPeek.mockResolvedValue(STORED);
    mockMaybeSingle.mockResolvedValue(vrRow());
  });

  it("binds from session, store, and verification when the continue-binding cookie is absent", async () => {
    const req = new NextRequest("http://localhost/qualify");
    const result = await resolveBoundPartnerContinuation({
      request: req,
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bindingPresent).toBe(false);
  });

  it("fails closed on a present mismatched binding cookie", async () => {
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: "vr-other" });
    const req = new NextRequest("http://localhost/qualify");
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    const result = await resolveBoundPartnerContinuation({
      request: req,
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result).toMatchObject({ ok: false, code: "invalid_binding", clearBinding: true });
    expect(mockPeek).not.toHaveBeenCalled();
  });

  it("fails closed on stale, cross-tenant, altered version, missing session, and replay", async () => {
    mockPeek.mockResolvedValue({ ...STORED, expiresAt: new Date(Date.now() - 1000).toISOString() });
    let result = await resolveBoundPartnerContinuation({
      request: new NextRequest("http://localhost/qualify"),
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result).toMatchObject({ ok: false, code: "stale" });

    mockPeek.mockResolvedValue(STORED);
    mockMaybeSingle.mockResolvedValue(vrRow({ partner_id: "other-partner" }));
    result = await resolveBoundPartnerContinuation({
      request: new NextRequest("http://localhost/qualify"),
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result).toMatchObject({ ok: false, code: "cross_partner" });

    mockMaybeSingle.mockResolvedValue(vrRow({ policy_version: 9 }));
    result = await resolveBoundPartnerContinuation({
      request: new NextRequest("http://localhost/qualify"),
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result).toMatchObject({ ok: false, code: "altered_version" });

    mockMaybeSingle.mockResolvedValue(vrRow({ sui_address: "" }));
    result = await resolveBoundPartnerContinuation({
      request: new NextRequest("http://localhost/qualify"),
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result).toMatchObject({ ok: false, code: "invalid_session" });

    mockMaybeSingle.mockResolvedValue(vrRow({ status: "decided" }));
    result = await resolveBoundPartnerContinuation({
      request: new NextRequest("http://localhost/qualify"),
      verifyRequestId: "vr-sandbox-1",
      sessionSubject: SUBJECT,
    });
    expect(result).toMatchObject({ ok: false, code: "replay" });
  });
});
