// FILE: lib/partner/goodTroubleSeekerHostedReturn.integration.test.ts
// Seeker-like sequence: bare vr_* continuation + resume gtv hint → purchase return redirect with gtv.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { mergePartnerReturnUrlHints } from "@/lib/partner/continuationReturnUrlMatch";

const FLOW_TOKEN = `gtf_${"e".repeat(64)}`;
const RESUME_RETURN = `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=${encodeURIComponent(FLOW_TOKEN)}`;
const BARE_CALLBACK = GOOD_TROUBLE_EXPECTED_CALLBACK_URL;
const VERIFY_REQUEST_ID = "vr_seeker_opaque_1";
const RECEIPT_ID = "dr_seeker_return_1";
const DECISION_ID = "vd_seeker_return_1";
const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const mockPeekByVerifyRequestId = vi.fn();
const mockPeek = vi.fn();
const mockSave = vi.fn();
const mockConsume = vi.fn();
const mockGetPolicy = vi.fn();
const mockFindOpaqueReceipt = vi.fn();
const mockGetReceiptById = vi.fn();
const mockIsReturnUrlAllowed = vi.fn();
const mockLoadHandoff = vi.fn();
const mockBindHandoff = vi.fn();
const mockVerifyResumeCookie = vi.fn();

vi.mock("@/lib/partner/partnerVerifyResumeCookie", () => ({
  PARTNER_VERIFY_RESUME_COOKIE: "abraxas_partner_verify_resume",
  verifyPartnerVerifyResumeCookie: (...args: unknown[]) => mockVerifyResumeCookie(...args),
}));

vi.mock("@/lib/partner/hostedHandoff/store", () => ({
  loadHandoffByVerifyRequest: (...args: unknown[]) => mockLoadHandoff(...args),
  bindHandoffToIssuedReceipt: (...args: unknown[]) => mockBindHandoff(...args),
}));

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeekByVerifyRequestId(...args),
    peek: (...args: unknown[]) => mockPeek(...args),
    save: (...args: unknown[]) => mockSave(...args),
    consume: (...args: unknown[]) => mockConsume(...args),
  }),
}));

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findReceiptForVerificationRequest: vi.fn(),
  findReceiptForOpaqueVerifyRequest: (...args: unknown[]) => mockFindOpaqueReceipt(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => mockGetReceiptById(...args),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: (...args: unknown[]) => mockIsReturnUrlAllowed(...args),
  buildRedirectUrl: (base: string, params: Record<string, string>) => {
    const url = new URL(base);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  },
}));

function futureIso(ms = 60_000) {
  return new Date(Date.now() + ms).toISOString();
}

function stubOpaqueContinuation(overrides: Record<string, unknown> = {}) {
  return {
    jti: "jti-seeker-bound",
    partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policyVersion: 2,
    returnUrl: BARE_CALLBACK,
    purpose: "purchase",
    createdAt: new Date().toISOString(),
    expiresAt: futureIso(),
    consumedAt: null,
    verifyRequestId: VERIFY_REQUEST_ID,
    ...overrides,
  };
}

describe("Good Trouble Seeker hosted return sequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyResumeCookie.mockResolvedValue({ jti: "jti-seeker-resume" });
    mockPeek.mockResolvedValue(
      stubOpaqueContinuation({ jti: "jti-seeker-resume", returnUrl: RESUME_RETURN }),
    );
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      version: 2,
      rules_json: { age_eligibility_only: true, minimum_assurance_cap: "L0" },
    });
    mockIsReturnUrlAllowed.mockResolvedValue(true);
    mockFindOpaqueReceipt.mockResolvedValue({
      decision_id: DECISION_ID,
      receipt_id: RECEIPT_ID,
      receipt: { id: RECEIPT_ID },
    });
    mockGetReceiptById.mockResolvedValue({
      id: RECEIPT_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      decision_result: "approved",
      expires_at: futureIso(86_400_000),
    });
    mockConsume.mockImplementation(async (jti: string) => ({
      ...stubOpaqueContinuation(),
      jti,
      consumedAt: new Date().toISOString(),
    }));
    mockLoadHandoff.mockResolvedValue({
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      status: "completed",
    });
  });

  it("mirrors Seeker Share step: bound bare URL + session resume → server hint restores gtv", async () => {
    mockPeekByVerifyRequestId.mockResolvedValue(stubOpaqueContinuation());

    const shareStepReturnUrl = mergePartnerReturnUrlHints(BARE_CALLBACK, RESUME_RETURN);
    expect(shareStepReturnUrl).toContain(FLOW_TOKEN);

    const { resolvePartnerReturnUrlHintForRequest } = await import("./partnerReturnUrlHint");
    const req = new NextRequest("http://localhost/api/v1/partner-flow/purchase-return", {
      headers: { cookie: "abraxas_partner_verify_resume=signed.resume" },
    });
    const serverHint = await resolvePartnerReturnUrlHintForRequest(req, shareStepReturnUrl);
    expect(serverHint).toContain(FLOW_TOKEN);

    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
      clientReturnUrl: serverHint,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.redirect_url);
    expect(url.searchParams.get("gtv")).toBe(FLOW_TOKEN);
    expect(url.searchParams.get("receipt_id")).toBe(RECEIPT_ID);
    expect(mockSave).toHaveBeenCalled();
  });

  it("fails with missing_flow_token when neither continuation nor resume carries gtv", async () => {
    mockPeekByVerifyRequestId.mockResolvedValue(stubOpaqueContinuation());
    mockPeek.mockResolvedValue(
      stubOpaqueContinuation({ jti: "jti-seeker-resume", returnUrl: BARE_CALLBACK }),
    );

    const { resolvePartnerReturnUrlHintForRequest } = await import("./partnerReturnUrlHint");
    const req = new NextRequest("http://localhost/api/v1/partner-flow/purchase-return", {
      headers: { cookie: "abraxas_partner_verify_resume=signed.resume" },
    });
    const serverHint = await resolvePartnerReturnUrlHintForRequest(req, BARE_CALLBACK);

    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
      clientReturnUrl: serverHint || undefined,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("missing_flow_token");
  });
});
