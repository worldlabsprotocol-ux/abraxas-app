import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireSession = vi.fn();
const mockConsentAndDecide = vi.fn();
const mockOpaqueConsent = vi.fn();
const mockRequireQualified = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => mockRequireSession(...args),
}));

vi.mock("@/lib/verification/requestsService", () => ({
  consentAndDecide: (...args: unknown[]) => mockConsentAndDecide(...args),
}));

vi.mock("@/lib/partner/hostedHandoff/consentAndIssueReceipt", () => ({
  consentOpaqueHostedHandoff: (...args: unknown[]) => mockOpaqueConsent(...args),
  HostedHandoffConsentError: class HostedHandoffConsentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
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

const UUID = "690d0c89-7b98-4946-8ad2-7469f5ca89d9";
const OPAQUE = "vr_hosted_consent01";

describe("consent route opaque hosted handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { suiAddress: "0xabc" },
    });
    mockOpaqueConsent.mockResolvedValue({
      decision: "approved",
      decision_id: "dec-opaque",
      receipt_id: "dr-opaque",
      claims: { over_21: true },
      reason_codes: [],
      valid_until: new Date().toISOString(),
      idempotent_replay: false,
    });
    mockRequireQualified.mockResolvedValue({ ok: true });
    mockMaybeSingle.mockResolvedValue({
      data: { partner_id: "good-trouble", policy_id: "good-trouble-age_21_retail-v1" },
    });
  });

  it("routes vr_* identifiers to hosted consent without querying verification_requests", async () => {
    const res = await POST(
      new NextRequest(`http://localhost/api/v1/verification-requests/${OPAQUE}/consent`, { method: "POST" }),
      { params: Promise.resolve({ id: OPAQUE }) },
    );
    expect(res.status).toBe(200);
    expect(mockOpaqueConsent).toHaveBeenCalled();
    expect(mockMaybeSingle).not.toHaveBeenCalled();
    expect(mockConsentAndDecide).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.receipt_id).toBe("dr-opaque");
  });

  it("preserves database UUID consent path", async () => {
    mockConsentAndDecide.mockResolvedValue({
      decision: "approved",
      decision_id: "dec-uuid",
      receipt_id: "dr-uuid",
      claims: {},
      reason_codes: [],
      valid_until: null,
    });
    const res = await POST(
      new NextRequest(`http://localhost/api/v1/verification-requests/${UUID}/consent`, { method: "POST" }),
      { params: Promise.resolve({ id: UUID }) },
    );
    expect(res.status).toBe(200);
    expect(mockConsentAndDecide).toHaveBeenCalledWith(expect.objectContaining({ requestId: UUID }));
    expect(mockOpaqueConsent).not.toHaveBeenCalled();
  });
});
