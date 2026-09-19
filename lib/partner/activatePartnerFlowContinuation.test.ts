// FILE: lib/partner/activatePartnerFlowContinuation.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateRequest = vi.fn();

vi.mock("@/lib/verification/requestsService", () => ({
  createVerificationRequest: (...args: unknown[]) => mockCreateRequest(...args),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn().mockResolvedValue(true),
}));

import {
  createMemoryContinuationStore,
  createPartnerFlowContinuationRecord,
} from "./partnerFlowContinuation";
import { activatePartnerFlowContinuation, peekContinuationSafeView } from "./activatePartnerFlowContinuation";
import { shouldShowPartnerConsent } from "./partnerConsentVisibility";

const SAMPLE = {
  partnerId: "good-trouble-cannabis",
  policyId: "good-trouble-retail-v1",
  returnUrl: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_abc123",
  policyVersion: 2,
};

describe("activatePartnerFlowContinuation", () => {
  beforeEach(() => {
    mockCreateRequest.mockReset();
    mockCreateRequest.mockResolvedValue({ request_id: "vr-exact-1" });
  });

  it("resumes the exact partner/policy/version request without issuing a receipt", async () => {
    const record = createPartnerFlowContinuationRecord(SAMPLE)!;
    const store = createMemoryContinuationStore([record]);

    const result = await activatePartnerFlowContinuation({
      store,
      jti: record.jti,
      suiAddress: "0xabc",
      allowReturnUrl: async () => true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issuedReceipt).toBe(false);
    expect(result.continuePath).toBe(
      "/partner/continue?verify_request=vr-exact-1&partner_id=good-trouble-cannabis&policy_id=good-trouble-retail-v1",
    );
    expect(result.continuePath).not.toContain("return");
    expect(mockCreateRequest).toHaveBeenCalledWith(expect.objectContaining({
      partnerId: SAMPLE.partnerId,
      policyId: SAMPLE.policyId,
      expectedPolicyVersion: 2,
    }));
    expect(JSON.stringify(mockCreateRequest.mock.calls)).not.toMatch(/receipt/i);
    expect(shouldShowPartnerConsent({
      verificationRequestId: result.verifyRequestId,
      identityComplete: true,
      consentDismissed: false,
      underReview: false,
      handoffReady: false,
    })).toBe(true);
  });

  it("sign-in without a continuation never creates a verification request", async () => {
    const store = createMemoryContinuationStore();
    const result = await activatePartnerFlowContinuation({
      store,
      jti: null,
      suiAddress: "0xabc",
      allowReturnUrl: async () => true,
    });
    expect(result).toEqual({ ok: false, code: "missing" });
    expect(mockCreateRequest).not.toHaveBeenCalled();
  });

  it("fails closed on replay after a successful activate", async () => {
    const record = createPartnerFlowContinuationRecord(SAMPLE)!;
    const store = createMemoryContinuationStore([record]);
    const first = await activatePartnerFlowContinuation({
      store,
      jti: record.jti,
      allowReturnUrl: async () => true,
    });
    expect(first.ok).toBe(true);

    const second = await activatePartnerFlowContinuation({
      store,
      jti: record.jti,
      allowReturnUrl: async () => true,
    });
    expect(second).toEqual({ ok: false, code: "replay" });
    expect(mockCreateRequest).toHaveBeenCalledTimes(1);
  });

  it("fails closed on expired, cross-partner, altered policy/version, and open redirect", async () => {
    const record = createPartnerFlowContinuationRecord(SAMPLE)!;
    const expired = createMemoryContinuationStore([{
      ...record,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    }]);
    expect(await activatePartnerFlowContinuation({
      store: expired,
      jti: record.jti,
      allowReturnUrl: async () => true,
    })).toEqual({ ok: false, code: "expired" });

    const live = createMemoryContinuationStore([record]);
    expect(await activatePartnerFlowContinuation({
      store: live,
      jti: record.jti,
      claimedPartnerId: "other-partner",
      allowReturnUrl: async () => true,
    })).toEqual({ ok: false, code: "cross_partner" });

    expect(await activatePartnerFlowContinuation({
      store: createMemoryContinuationStore([record]),
      jti: record.jti,
      claimedPolicyId: "altered-policy",
      allowReturnUrl: async () => true,
    })).toEqual({ ok: false, code: "altered_policy" });

    expect(await activatePartnerFlowContinuation({
      store: createMemoryContinuationStore([record]),
      jti: record.jti,
      claimedPolicyVersion: 9,
      allowReturnUrl: async () => true,
    })).toEqual({ ok: false, code: "altered_version" });

    expect(await activatePartnerFlowContinuation({
      store: createMemoryContinuationStore([record]),
      jti: record.jti,
      claimedReturnUrl: "https://evil.example/callback",
      allowReturnUrl: async () => true,
    })).toEqual({ ok: false, code: "open_redirect" });

    expect(await activatePartnerFlowContinuation({
      store: createMemoryContinuationStore([record]),
      jti: record.jti,
      allowReturnUrl: async () => false,
    })).toEqual({ ok: false, code: "open_redirect" });

    expect(mockCreateRequest).not.toHaveBeenCalled();
  });

  it("peek never returns a URL or secrets", () => {
    const record = createPartnerFlowContinuationRecord(SAMPLE)!;
    const view = peekContinuationSafeView(record);
    expect(view).toEqual({
      hasContinuation: true,
      action: "return_to_partner_verification",
    });
    expect(JSON.stringify(view)).not.toMatch(/return_url|receipt|https|token|0x/i);
  });
});
