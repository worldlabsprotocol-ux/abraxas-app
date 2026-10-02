// FILE: lib/partner/goodTroublePurchaseReturnBinding.integration.test.ts
// Regression: Good Trouble purchase return URL binding survives canonicalization.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";
import { partnerContinuationReturnUrlsMatch } from "@/lib/partner/continuationReturnUrlMatch";
import { assertContinuationMatchesStored } from "@/lib/partner/partnerFlowContinuation";

const FLOW_TOKEN = `gtf_${"c".repeat(64)}`;
const STORED_RETURN = `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=${FLOW_TOKEN}`;
const ENCODED_RETURN = `${GOOD_TROUBLE_EXPECTED_CALLBACK_URL}?gtv=${encodeURIComponent(FLOW_TOKEN)}`;

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

describe("Good Trouble purchase return binding integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPeekByVerifyRequestId.mockResolvedValue(null);
    mockPeek.mockResolvedValue(null);
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-secret";
  });

  it("1. structured comparison accepts encoded vs stored purchase callback", () => {
    expect(partnerContinuationReturnUrlsMatch(STORED_RETURN, ENCODED_RETURN)).toBe(true);
  });

  it("2. assertContinuationMatchesStored accepts canonicalized return URL", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const result = assertContinuationMatchesStored({
      stored: {
        jti: "jti-1",
        partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        policyVersion: 2,
        returnUrl: STORED_RETURN,
        purpose: "purchase",
        createdAt: new Date().toISOString(),
        expiresAt: future,
      },
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policyVersion: 2,
      returnUrl: ENCODED_RETURN,
    });
    expect(result).toEqual({ ok: true });
  });

  it("3. bindPartnerFlowContinuationForEvaluate reuses continuation across encoding", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockPeekByVerifyRequestId.mockResolvedValue({
      jti: "jti-existing",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policyVersion: 2,
      purpose: "purchase",
      returnUrl: STORED_RETURN,
      createdAt: new Date().toISOString(),
      expiresAt: future,
      consumedAt: null,
      verifyRequestId: "vr-gt-1",
    });

    const { bindPartnerFlowContinuationForEvaluate } = await import("./bindPartnerFlowContinuationForEvaluate");
    const result = await bindPartnerFlowContinuationForEvaluate({
      request: new NextRequest("http://localhost/evaluate"),
      verifyRequestId: "vr-gt-1",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: ENCODED_RETURN,
      purpose: "purchase",
      policyVersion: 2,
    });

    expect(result).toEqual({ ok: true, verifyRequestId: "vr-gt-1" });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("4. rejects browse callback for purchase policy", () => {
    const browse = `https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_${"b".repeat(64)}`;
    expect(partnerContinuationReturnUrlsMatch(STORED_RETURN, browse)).toBe(false);
  });

  it("5. age eligibility policy v2 remains L0 purchase tuple", () => {
    expect(GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES.age_eligibility_only).toBe(true);
    expect(GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES.minimum_assurance_cap).toBe("L0");
  });
});
