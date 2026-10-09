// FILE: lib/partner/goodTroublePurchaseReturnHandoff.integration.test.ts
// Regression: L0 purchase completion exposes working Return to Good Trouble with gtv + receipt_id.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { extractGoodTroubleFlowToken } from "@/lib/partner/continuationReturnUrlMatch";
import { scanValueForAgePrivacyViolations } from "@/lib/idv/agePrivacyProof";

const FLOW_TOKEN = `gtf_${"d".repeat(64)}`;
const STORED_RETURN = `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=${FLOW_TOKEN}`;
const VERIFY_REQUEST_ID = "vr-gt-return-1";
const RECEIPT_ID = "dr_gt_return_1";
const DECISION_ID = "vd_gt_return_1";
const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const mockPeekByVerifyRequestId = vi.fn();
const mockSave = vi.fn();
const mockConsume = vi.fn();
const mockGetPolicy = vi.fn();
const mockFindReceipt = vi.fn();
const mockGetReceiptById = vi.fn();
const mockIsReturnUrlAllowed = vi.fn();
const mockLoadVr = vi.fn();
const mockLoadHandoff = vi.fn();
const mockBindHandoff = vi.fn();
const mockFindOpaqueReceipt = vi.fn();

vi.mock("@/lib/partner/hostedHandoff/store", () => ({
  loadHandoffByVerifyRequest: (...args: unknown[]) => mockLoadHandoff(...args),
  bindHandoffToIssuedReceipt: (...args: unknown[]) => mockBindHandoff(...args),
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
  findReceiptForVerificationRequest: (...args: unknown[]) => mockFindReceipt(...args),
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

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockLoadVr(),
        }),
      }),
    }),
  }),
}));

function futureIso(ms = 60_000) {
  return new Date(Date.now() + ms).toISOString();
}

function stubContinuation(overrides: Record<string, unknown> = {}) {
  return {
    jti: "jti-return-1",
    partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policyVersion: 2,
    returnUrl: STORED_RETURN,
    purpose: "purchase",
    createdAt: new Date().toISOString(),
    expiresAt: futureIso(),
    consumedAt: null,
    verifyRequestId: VERIFY_REQUEST_ID,
    ...overrides,
  };
}

function stubHappyPath() {
  mockLoadVr.mockResolvedValue({
    data: {
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      status: "decided",
      sui_address: SUBJECT,
      subject_id: SUBJECT,
    },
  });
  mockGetPolicy.mockResolvedValue({
    id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    version: 2,
    rules_json: { age_eligibility_only: true, minimum_assurance_cap: "L0" },
  });
  mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation());
  mockIsReturnUrlAllowed.mockResolvedValue(true);
  mockFindReceipt.mockResolvedValue({
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
}

describe("Good Trouble purchase return handoff integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBindHandoff.mockResolvedValue(undefined);
  });

  it("1. successful return builds redirect with gtv and receipt_id", async () => {
    stubHappyPath();
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const url = new URL(result.redirect_url);
    expect(url.origin + url.pathname).toBe(GOOD_TROUBLE_EXPECTED_CALLBACK_URL);
    expect(url.searchParams.get("gtv")).toBe(FLOW_TOKEN);
    expect(url.searchParams.get("receipt_id")).toBe(RECEIPT_ID);
    expect(url.searchParams.get("status")).toBe("approved");
    expect(url.searchParams.get("decision_id")).toBe(DECISION_ID);
    expect(mockConsume).toHaveBeenCalledWith("jti-return-1");
  });

  it("1b. upgrades bare stored callback when client supplies matching gtv hint", async () => {
    stubHappyPath();
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation({
      returnUrl: GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
    }));
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
      clientReturnUrl: STORED_RETURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.redirect_url);
    expect(url.searchParams.get("gtv")).toBe(FLOW_TOKEN);
    expect(url.searchParams.get("receipt_id")).toBe(RECEIPT_ID);
    expect(mockSave).toHaveBeenCalled();
  });

  it("1c. fails closed when continuation lacks gtv and no client hint", async () => {
    stubHappyPath();
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation({
      returnUrl: GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
    }));
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("missing_flow_token");
  });

  it("2. uses stored authoritative continuation, not client return_url override", async () => {
    stubHappyPath();
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const evil = "https://evil.example/age-verification-result?gtv=gtf_evil";
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
      clientReturnUrl: evil,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("open_redirect");
  });

  it("3. rejects altered callback path", async () => {
    stubHappyPath();
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation({
      returnUrl: `https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_${"b".repeat(64)}`,
    }));
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("altered_path");
  });

  it("4. rejects altered gtv token", async () => {
    stubHappyPath();
    const tampered = `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=gtf_${"e".repeat(64)}`;
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
      clientReturnUrl: tampered,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("open_redirect");
  });

  it("5. idempotent return after continuation consumed replays redirect safely", async () => {
    stubHappyPath();
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation({ consumedAt: new Date().toISOString() }));
    mockConsume.mockResolvedValue(null);
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replay).toBe(true);
    expect(new URL(result.redirect_url).searchParams.get("receipt_id")).toBe(RECEIPT_ID);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("6. rejects receipt_id mismatch", async () => {
    stubHappyPath();
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: "dr_wrong",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("receipt_mismatch");
  });

  it("7. redirect params contain no raw DOB", async () => {
    stubHappyPath();
    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: VERIFY_REQUEST_ID,
      receiptId: RECEIPT_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.redirect_url);
    const params = Object.fromEntries(url.searchParams.entries());
    expect(scanValueForAgePrivacyViolations(params).ok).toBe(true);
    expect(extractGoodTroubleFlowToken(result.redirect_url)).toBe(FLOW_TOKEN);
  });

  it("9b. opaque vr_* return succeeds when handoff still created but receipt issued", async () => {
    const opaque = "vr_gt_return_created1";
    mockLoadHandoff.mockResolvedValue({
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      status: "created",
      binding_id: "primary:690d0c89-7b98-4946-8ad2-7469f5ca89d9",
    });
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      version: 2,
      rules_json: { age_eligibility_only: true, minimum_assurance_cap: "L0" },
    });
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation({ verifyRequestId: opaque }));
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
      ...stubContinuation({ verifyRequestId: opaque }),
      jti,
      consumedAt: new Date().toISOString(),
    }));

    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: opaque,
      receiptId: RECEIPT_ID,
    });
    expect(result.ok).toBe(true);
    expect(mockBindHandoff).toHaveBeenCalled();
  });

  it("9. opaque vr_* return resolves receipt via idempotency without verification_requests UUID", async () => {
    const opaque = "vr_gt_return_opaque1";
    mockLoadHandoff.mockResolvedValue({
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      status: "completed",
    });
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      version: 2,
      rules_json: { age_eligibility_only: true, minimum_assurance_cap: "L0" },
    });
    mockPeekByVerifyRequestId.mockResolvedValue(stubContinuation({ verifyRequestId: opaque }));
    mockIsReturnUrlAllowed.mockResolvedValue(true);
    mockFindOpaqueReceipt.mockResolvedValue({
      decision_id: DECISION_ID,
      receipt_id: RECEIPT_ID,
      receipt: { id: RECEIPT_ID },
    });
    mockFindReceipt.mockResolvedValue(null);
    mockGetReceiptById.mockResolvedValue({
      id: RECEIPT_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      decision_result: "approved",
      expires_at: futureIso(86_400_000),
    });
    mockConsume.mockImplementation(async (jti: string) => ({
      ...stubContinuation({ verifyRequestId: opaque }),
      jti,
      consumedAt: new Date().toISOString(),
    }));

    const { completeAgeEligibilityPurchaseReturn } = await import("./completeAgeEligibilityPurchaseReturn");
    const result = await completeAgeEligibilityPurchaseReturn({
      suiAddress: SUBJECT,
      verificationRequestId: opaque,
      receiptId: RECEIPT_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockLoadVr).not.toHaveBeenCalled();
    expect(mockFindOpaqueReceipt).toHaveBeenCalled();
    expect(new URL(result.redirect_url).searchParams.get("receipt_id")).toBe(RECEIPT_ID);
  });

  it("8. browse age-access state architecture remains separate from purchase authorization", async () => {
    const { shouldSkipAgeGate, readBrowseVerifiedState } = await import(
      "../../examples/good-trouble-wix/pages/ageGateAccessState.js"
    );
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === "good_trouble_abraxas_browse_verified") {
          return JSON.stringify({
            expiresAt: Date.now() + 86_400_000,
            verifiedAt: Date.now(),
          });
        }
        return null;
      }),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };
    const skip = shouldSkipAgeGate({
      localStorage: storage as unknown as Storage,
      sessionStorage: storage as unknown as Storage,
    });
    expect(skip.skip).toBe(true);
    expect(skip.reason).toBe("abraxas_browse_verified");
    const state = readBrowseVerifiedState(storage as unknown as Storage);
    expect(state.valid).toBe(true);
    if (state.valid) {
      expect(JSON.stringify(state)).not.toContain("date_of_birth");
      expect(JSON.stringify(state)).not.toContain("dob");
    }
  });
});
