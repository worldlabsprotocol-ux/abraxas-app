import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPeek = vi.fn();
const mockMaybeSingle = vi.fn();
const mockGetPolicy = vi.fn();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeek(...args),
  }),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: (...args: unknown[]) => mockGetPolicy(...args),
  getPartnerPolicyAtVersion: (...args: unknown[]) => mockGetPolicy(...args),
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

import { requireQualifiedPartnerMethod } from "./requirePartnerMethodQualification";
import { signPartnerContinueBindingCookie, PARTNER_CONTINUE_BINDING_COOKIE } from "./partnerVerifyResumeCookie";
import {
  PARTNER_METHOD_QUALIFICATION_COOKIE,
  signPartnerMethodQualificationCookie,
} from "./partnerMethodQualificationCookie";

const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000abc";
const STORED = {
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
  verifyRequestId: "vr-sandbox-1",
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
};

function vrRow() {
  return {
    data: {
      partner_id: STORED.partnerId,
      policy_id: STORED.policyId,
      sui_address: SUBJECT,
      status: "pending",
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    },
    error: null,
  };
}

describe("requireQualifiedPartnerMethod", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
    mockPeek.mockReset();
    mockPeek.mockResolvedValue(STORED);
    mockMaybeSingle.mockResolvedValue(vrRow());
    mockGetPolicy.mockResolvedValue({
      id: STORED.policyId,
      partner_id: STORED.partnerId,
      version: 1,
    });
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
      sessionSubject: SUBJECT,
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
      sessionSubject: SUBJECT,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.record.methodId).toBe("privacy_preserving");
      expect(ok.record.sandboxOnly).toBe(true);
      expect(ok.record.issuedReceipt).toBe(false);
    }

    mockPeek.mockResolvedValue({ ...STORED, policyId: "good-trouble-retail-v1" });
    mockMaybeSingle.mockResolvedValue({
      data: {
        ...vrRow().data,
        policy_id: "good-trouble-retail-v1",
      },
      error: null,
    });
    const cross = await requireQualifiedPartnerMethod({
      request: req,
      verifyRequestId: STORED.verifyRequestId,
      partnerId: STORED.partnerId,
      policyId: "good-trouble-retail-v1",
      sessionSubject: SUBJECT,
    });
    expect(cross.ok).toBe(false);
  });
});
