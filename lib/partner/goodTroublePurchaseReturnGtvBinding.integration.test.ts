// FILE: lib/partner/goodTroublePurchaseReturnGtvBinding.integration.test.ts
// Seeker-like: bare vr_* continuation + HttpOnly gtv binding cookie restores purchase return.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  buildGoodTroublePurchaseCallbackUrlWithGtv,
  signGoodTroubleGtvBindingCookie,
} from "@/lib/partner/goodTroubleGtvBindingCookie";

const FLOW_TOKEN = `gtf_${"f".repeat(64)}`;
const BINDING_RETURN = buildGoodTroublePurchaseCallbackUrlWithGtv(FLOW_TOKEN);
const BARE_CALLBACK = GOOD_TROUBLE_EXPECTED_CALLBACK_URL;
const VERIFY_REQUEST_ID = "vr_gtv_binding_1";
const RECEIPT_ID = "dr_gtv_binding_1";
const DECISION_ID = "vd_gtv_binding_1";
const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const mockPeekByVerifyRequestId = vi.fn();
const mockSave = vi.fn();
const mockConsume = vi.fn();
const mockGetPolicy = vi.fn();
const mockFindOpaqueReceipt = vi.fn();
const mockGetReceiptById = vi.fn();
const mockIsReturnUrlAllowed = vi.fn();
const mockLoadHandoff = vi.fn();

vi.mock("@/lib/partner/hostedHandoff/store", () => ({
  loadHandoffByVerifyRequest: (...args: unknown[]) => mockLoadHandoff(...args),
  bindHandoffToIssuedReceipt: vi.fn(),
}));

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => mockPeekByVerifyRequestId(...args),
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

function stubContinuation() {
  return {
    jti: "jti-gtv-bind",
    partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policyVersion: 2,
    returnUrl: BARE_CALLBACK,
    purpose: "purchase",
    createdAt: new Date().toISOString(),
    expiresAt: futureIso(),
    consumedAt: null,
    verifyRequestId: VERIFY_REQUEST_ID,
  };
}

describe("Good Trouble purchase return gtv binding cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-gtv-binding-secret";
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation());
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
      ...stubContinuation(),
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

  it("restores gtv on Return to Good Trouble when continuation is bare but binding cookie is present", async () => {
    const bindingToken = await signGoodTroubleGtvBindingCookie({
      verifyRequestId: VERIFY_REQUEST_ID,
      flowToken: FLOW_TOKEN,
    });
    expect(bindingToken).toBeTruthy();

    const { resolvePartnerReturnUrlHintForRequest } = await import("./partnerReturnUrlHint");
    const req = new NextRequest("http://localhost/api/v1/partner-flow/purchase-return", {
      headers: { cookie: `abraxas_good_trouble_gtv_binding=${bindingToken}` },
    });
    const serverHint = await resolvePartnerReturnUrlHintForRequest(req, BARE_CALLBACK, VERIFY_REQUEST_ID);
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
});
