import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireSession = vi.fn();
const mockConsentAndDecide = vi.fn();
const mockRequireQualified = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireSession(...args),
}));

vi.mock("@/lib/verification/requestsService", () => ({
  consentAndDecide: (...args: unknown[]) => mockConsentAndDecide(...args),
}));

vi.mock("@/lib/partner/requirePartnerMethodQualification", () => ({
  requireQualifiedPartnerMethod: (...args: unknown[]) => mockRequireQualified(...args),
}));

vi.mock("@/lib/partner/partnerFlowRouteGuard", () => ({
  enforcePartnerFlowRateLimit: vi.fn().mockResolvedValue(null),
  recordPartnerFlowRequestOutcome: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
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

vi.mock("@/lib/app/publicAppOrigin", () => ({
  getPublicAppOriginFromRequest: () => "http://localhost",
}));

import { POST } from "./route";

describe("consent route method qualification gate", () => {
  beforeEach(() => {
    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0xabc" },
    });
    mockConsentAndDecide.mockReset();
    mockRequireQualified.mockReset();
    mockMaybeSingle.mockResolvedValue({
      data: {
        partner_id: "circle-arc-demo-304",
        policy_id: "circle-arc-demo-304-sandbox_economic_demo-v1",
      },
    });
  });

  it("does not issue a receipt when the method is not server-qualified", async () => {
    mockRequireQualified.mockResolvedValue({ ok: false, code: "method_not_qualified" });
    const res = await POST(
      new NextRequest("http://localhost/api/v1/verification-requests/vr-sandbox-1/consent", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "vr-sandbox-1" }) },
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ issuedReceipt: false, code: "method_not_qualified" });
    expect(mockConsentAndDecide).not.toHaveBeenCalled();
  });

  it("issues a receipt only after qualification and explicit consent", async () => {
    mockRequireQualified.mockResolvedValue({ ok: true });
    mockConsentAndDecide.mockResolvedValue({
      decision: "allow",
      decision_reference: "dec-sandbox",
      decision_context: "sandbox_only",
    });
    const res = await POST(
      new NextRequest("http://localhost/api/v1/verification-requests/vr-sandbox-1/consent", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "vr-sandbox-1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockConsentAndDecide).toHaveBeenCalledWith({
      requestId: "vr-sandbox-1",
      suiAddress: "0xabc",
    });
    const body = await res.json() as { decision_context?: string };
    expect(body.decision_context ?? "sandbox_only").toBe("sandbox_only");
  });
});
