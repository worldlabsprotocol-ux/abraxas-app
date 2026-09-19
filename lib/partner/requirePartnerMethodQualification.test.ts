import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPeek = vi.fn();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeek(...args),
  }),
}));

import { requireQualifiedPartnerMethod } from "./requirePartnerMethodQualification";
import { signPartnerContinueBindingCookie, PARTNER_CONTINUE_BINDING_COOKIE } from "./partnerVerifyResumeCookie";
import {
  PARTNER_METHOD_QUALIFICATION_COOKIE,
  signPartnerMethodQualificationCookie,
} from "./partnerMethodQualificationCookie";

const STORED = {
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
  verifyRequestId: "vr-sandbox-1",
};

describe("requireQualifiedPartnerMethod", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
    mockPeek.mockReset();
    mockPeek.mockResolvedValue(STORED);
  });

  it("denies consent when the method is only selected", async () => {
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: STORED.verifyRequestId });
    const req = new NextRequest("http://localhost/consent", { method: "POST" });
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    const result = await requireQualifiedPartnerMethod({
      request: req,
      verifyRequestId: STORED.verifyRequestId,
      partnerId: STORED.partnerId,
      policyId: STORED.policyId,
    });
    expect(result).toEqual({ ok: false, code: "method_not_qualified" });
  });

  it("accepts a cookie only when it matches the stored continuation binding", async () => {
    const binding = await signPartnerContinueBindingCookie({ verifyRequestId: STORED.verifyRequestId });
    const q = await signPartnerMethodQualificationCookie({
      verifyRequestId: STORED.verifyRequestId,
      partnerId: STORED.partnerId,
      policyId: STORED.policyId,
      policyVersion: 1,
      methodId: "privacy_preserving",
      state: "qualified",
      qualified: true,
      issuedReceipt: false,
      sandboxOnly: true,
    });
    const req = new NextRequest("http://localhost/consent", { method: "POST" });
    req.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, binding!);
    req.cookies.set(PARTNER_METHOD_QUALIFICATION_COOKIE, q!);
    const ok = await requireQualifiedPartnerMethod({
      request: req,
      verifyRequestId: STORED.verifyRequestId,
      partnerId: STORED.partnerId,
      policyId: STORED.policyId,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.record.methodId).toBe("privacy_preserving");
      expect(ok.record.sandboxOnly).toBe(true);
      expect(ok.record.issuedReceipt).toBe(false);
    }

    mockPeek.mockResolvedValue({ ...STORED, policyId: "good-trouble-retail-v1" });
    const cross = await requireQualifiedPartnerMethod({
      request: req,
      verifyRequestId: STORED.verifyRequestId,
      partnerId: STORED.partnerId,
      policyId: "good-trouble-retail-v1",
    });
    expect(cross.ok).toBe(false);
  });
});
