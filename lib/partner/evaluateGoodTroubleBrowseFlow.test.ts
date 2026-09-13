// FILE: lib/partner/evaluateGoodTroubleBrowseFlow.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

const mockReuse = vi.fn();
const mockCreateRequest = vi.fn();
const mockGetPolicy = vi.fn();
const mockRevocation = vi.fn();

vi.mock("@/lib/assurance/selfAttestation/reuseBrowseSelfAttestation", () => ({
  reuseBrowseSelfAttestation: (...args: unknown[]) => mockReuse(...args),
  buildBrowseReturnUrl: (returnUrl: string, input: {
    browseReceipt: string;
    browseReceiptId: string;
    policyId: string;
  }) => {
    const target = new URL(returnUrl);
    target.searchParams.set("browse_receipt", input.browseReceipt);
    target.searchParams.set("browse_receipt_id", input.browseReceiptId);
    target.searchParams.set("policy_id", input.policyId);
    target.searchParams.set("purpose", "browse");
    return target.toString();
  },
}));

vi.mock("@/lib/verification/requestsService", () => ({
  createVerificationRequest: (...args: unknown[]) => mockCreateRequest(...args),
  getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("@/lib/partner/partnerFlowRevocationRuntime", () => ({
  checkPartnerFlowRevocationGate: (...args: unknown[]) => mockRevocation(...args),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn().mockResolvedValue(true),
  buildRedirectUrl: vi.fn(),
}));

import {
  evaluateGoodTroubleBrowseFlow,
  evaluatePartnerFlow,
  resolvePartnerFlowStep,
} from "@/lib/partner/relyingPartyFlow";

const RETURN_URL =
  "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test";

describe("evaluateGoodTroubleBrowseFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      version: 1,
      rules_json: { browse_access_only: true },
    });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-browse-1" });
  });

  it("returns enter with browse receipt when reusable proof exists", async () => {
    mockReuse.mockResolvedValue({
      ok: true,
      browse_receipt: "jwt-browse",
      browse_receipt_id: "br_1",
      expires_at: "2099-01-01T00:00:00.000Z",
      age_band: "over_21",
    });

    const result = await evaluateGoodTroubleBrowseFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    });

    expect(result.next).toBe("enter");
    expect(result.redirect_url).toContain("browse_receipt=jwt-browse");
    expect(result.redirect_url).toContain("purpose=browse");
    expect(mockCreateRequest).not.toHaveBeenCalled();
  });

  it("routes first-time users to DOB continue with purpose=browse", async () => {
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });

    const result = await evaluateGoodTroubleBrowseFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(result.passport_url).toContain("/partner/continue?");
    expect(result.passport_url).toContain("purpose=browse");
    expect(result.passport_url).toContain("policy_id=good-trouble-browse-v1");
    expect(mockCreateRequest).toHaveBeenCalled();
  });
});

describe("evaluatePartnerFlow browse short-circuit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      version: 1,
      rules_json: { browse_access_only: true },
    });
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-browse-2" });
  });

  it("never routes browse tuple through purchase pending_review", async () => {
    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(result.next).not.toBe("pending_review");
  });

  it("routes browse policy to DOB continue when purpose was dropped after OAuth", async () => {
    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(result.passport_url).toContain("purpose=browse");
    expect(result.passport_url).toContain("good-trouble-browse-v1");
    expect(mockCreateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      }),
    );
  });
});

describe("resolvePartnerFlowStep browse routing", () => {
  it("skips pending_review for browse flows", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "pending_review",
      policyDecision: "approved",
      authenticated: true,
      browseFlow: true,
    })).toBe("passport");
  });

  it("still pending_review for regulated purchase", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "pending_review",
      policyDecision: "approved",
      authenticated: true,
    })).toBe("pending_review");
  });
});
