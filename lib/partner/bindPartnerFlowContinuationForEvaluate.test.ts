// FILE: lib/partner/bindPartnerFlowContinuationForEvaluate.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";

const mockPeekByVerifyRequestId = vi.fn();
const mockPeek = vi.fn();
const mockAttach = vi.fn();
const mockSave = vi.fn();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeekByVerifyRequestId(...args),
    peek: (...args: unknown[]) => mockPeek(...args),
    attachVerifyRequestId: (...args: unknown[]) => mockAttach(...args),
    save: (...args: unknown[]) => mockSave(...args),
  }),
}));

describe("bindPartnerFlowContinuationForEvaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPeekByVerifyRequestId.mockResolvedValue(null);
    mockPeek.mockResolvedValue(null);
    mockAttach.mockResolvedValue(undefined);
    mockSave.mockResolvedValue(undefined);
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-secret";
  });

  it("reuses an existing continuation already keyed by verify_request_id", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockPeekByVerifyRequestId.mockResolvedValue({
      jti: "jti-existing",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=gtf_test`,
      createdAt: new Date().toISOString(),
      expiresAt: future,
      consumedAt: null,
      verifyRequestId: "vr-1",
    });

    const { bindPartnerFlowContinuationForEvaluate } = await import("./bindPartnerFlowContinuationForEvaluate");
    const result = await bindPartnerFlowContinuationForEvaluate({
      request: new NextRequest("http://localhost/evaluate"),
      verifyRequestId: "vr-1",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=gtf_test`,
    });

    expect(result).toEqual({ ok: true, verifyRequestId: "vr-1" });
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockAttach).not.toHaveBeenCalled();
  });

  it("attaches verify_request_id to resume continuation when present", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockPeek.mockResolvedValue({
      jti: "jti-resume",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=gtf_test`,
      createdAt: new Date().toISOString(),
      expiresAt: future,
      consumedAt: null,
      verifyRequestId: null,
    });

    const { signPartnerVerifyResumeCookie } = await import("@/lib/partner/partnerVerifyResumeCookie");
    const token = await signPartnerVerifyResumeCookie({ jti: "jti-resume" });
    const req = new NextRequest("http://localhost/evaluate");
    req.cookies.set("abraxas_partner_verify_resume", token!);

    const { bindPartnerFlowContinuationForEvaluate } = await import("./bindPartnerFlowContinuationForEvaluate");
    const result = await bindPartnerFlowContinuationForEvaluate({
      request: req,
      verifyRequestId: "vr-new",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=gtf_test`,
    });

    expect(result).toEqual({ ok: true, verifyRequestId: "vr-new" });
    expect(mockAttach).toHaveBeenCalledWith("jti-resume", "vr-new");
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("creates a fresh continuation when no resume cookie exists", async () => {
    const { bindPartnerFlowContinuationForEvaluate } = await import("./bindPartnerFlowContinuationForEvaluate");
    const result = await bindPartnerFlowContinuationForEvaluate({
      request: new NextRequest("http://localhost/evaluate"),
      verifyRequestId: "vr-fresh",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=gtf_test`,
    });

    expect(result).toEqual({ ok: true, verifyRequestId: "vr-fresh" });
    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0]?.[0] as { verifyRequestId?: string; returnUrl?: string };
    expect(saved.verifyRequestId).toBe("vr-fresh");
    expect(saved.returnUrl).toContain("gtv=gtf_test");
  });
});
