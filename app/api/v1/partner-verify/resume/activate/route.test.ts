// FILE: app/api/v1/partner-verify/resume/activate/route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CONTINUATION_STORE_UNAVAILABLE } from "@/lib/partner/partnerFlowContinuation";

const mockActivate = vi.fn();
const mockRequireSession = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireSession(...args),
}));

vi.mock("@/lib/partner/activatePartnerFlowContinuation", () => ({
  activatePartnerFlowContinuation: (...args: unknown[]) => mockActivate(...args),
}));

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({ kind: "supabase" }),
}));

vi.mock("@/lib/partner/partnerVerifyResumeCookie", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/partnerVerifyResumeCookie")>(
    "@/lib/partner/partnerVerifyResumeCookie",
  );
  return {
    ...actual,
    verifyPartnerVerifyResumeCookie: vi.fn().mockResolvedValue({ jti: "jti-1" }),
    signPartnerContinueBindingCookie: vi.fn().mockResolvedValue(null),
  };
});

import { POST } from "./route";
import { PARTNER_VERIFY_RESUME_COOKIE } from "@/lib/partner/partnerVerifyResumeCookie";

describe("partner-verify resume activate", () => {
  beforeEach(() => {
    mockActivate.mockReset();
    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0xabc" },
    });
  });

  it("returns continuation_store_unavailable without a continue path or receipt", async () => {
    mockActivate.mockResolvedValue({ ok: false, code: CONTINUATION_STORE_UNAVAILABLE });
    const req = new NextRequest("http://localhost/api/v1/partner-verify/resume/activate", {
      method: "POST",
      body: JSON.stringify({}),
    });
    req.cookies.set(PARTNER_VERIFY_RESUME_COOKIE, "opaque");
    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, code: CONTINUATION_STORE_UNAVAILABLE });
  });

  it("does not activate without a browser session", async () => {
    mockRequireSession.mockResolvedValue({ ok: false, status: 401, error: "Sign in required in this browser" });
    const res = await POST(new NextRequest("http://localhost/api/v1/partner-verify/resume/activate", {
      method: "POST",
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(401);
    expect(mockActivate).not.toHaveBeenCalled();
  });
});
