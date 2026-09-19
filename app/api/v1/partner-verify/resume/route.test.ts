// FILE: app/api/v1/partner-verify/resume/route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CONTINUATION_STORE_UNAVAILABLE } from "@/lib/partner/partnerFlowContinuation";

const mockSave = vi.fn();
const mockPeek = vi.fn();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    save: (...args: unknown[]) => mockSave(...args),
    peek: (...args: unknown[]) => mockPeek(...args),
  }),
}));

vi.mock("@/lib/partner/partnerVerifyResumeCookie", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/partnerVerifyResumeCookie")>(
    "@/lib/partner/partnerVerifyResumeCookie",
  );
  return {
    ...actual,
    signPartnerVerifyResumeCookie: vi.fn().mockResolvedValue("signed-jti"),
    verifyPartnerVerifyResumeCookie: vi.fn().mockResolvedValue({ jti: "jti-1" }),
  };
});

import { GET, POST } from "./route";
import { ContinuationStoreUnavailableError } from "@/lib/partner/partnerFlowContinuation";
import { PARTNER_VERIFY_RESUME_COOKIE } from "@/lib/partner/partnerVerifyResumeCookie";

const VALID_BODY = {
  partnerId: "good-trouble-cannabis",
  policyId: "good-trouble-retail-v1",
  returnUrl: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_abc123",
};

describe("partner-verify resume routes", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-resume-cookie-secret";
    mockSave.mockReset();
    mockPeek.mockReset();
  });

  it("create fails closed when the continuation table is unavailable", async () => {
    mockSave.mockRejectedValue(new ContinuationStoreUnavailableError());
    const res = await POST(new NextRequest("http://localhost/api/v1/partner-verify/resume", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, code: CONTINUATION_STORE_UNAVAILABLE });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("peek fails closed when the continuation table is unavailable", async () => {
    mockPeek.mockRejectedValue(new ContinuationStoreUnavailableError());
    const req = new NextRequest("http://localhost/api/v1/partner-verify/resume");
    req.cookies.set(PARTNER_VERIFY_RESUME_COOKIE, "opaque");
    const res = await GET(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, code: CONTINUATION_STORE_UNAVAILABLE });
  });

  it("peek without a cookie does not hit the store", async () => {
    const res = await GET(new NextRequest("http://localhost/api/v1/partner-verify/resume"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, hasContinuation: false, action: null });
    expect(mockPeek).not.toHaveBeenCalled();
  });
});
