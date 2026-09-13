// FILE: lib/partner/goodTroubleBrowseJourney.integration.test.ts
// Abraxas browse journey: evaluate → DOB continue → browse receipt return.

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

import { evaluateGoodTroubleBrowseFlow } from "@/lib/partner/relyingPartyFlow";
import { buildPartnerVerifyPath } from "@/lib/partner/partnerVerifyResume";

const RETURN_URL =
  "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test";

describe("Good Trouble browse journey integration (Abraxas)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      version: 1,
      rules_json: { browse_access_only: true },
    });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-browse-integration" });
  });

  it("preserves browse tuple in resumable partner verify path", () => {
    const path = buildPartnerVerifyPath({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: RETURN_URL,
    });

    expect(path).toContain("policy_id=good-trouble-browse-v1");
    expect(path).toContain("purpose=browse");
    expect(path).not.toContain("good-trouble-retail-v1");
    expect(path).not.toContain("age-verification-result");
  });

  it("first-time signed-in user routes to DOB continue with purpose=browse", async () => {
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });

    const result = await evaluateGoodTroubleBrowseFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(result.passport_url).toContain("purpose=browse");
    expect(result.passport_url).toContain("good-trouble-browse-v1");
    expect(result.passport_url).not.toContain("good-trouble-retail-v1");
  });

  it("returning user with reusable proof auto-returns to Good Trouble", async () => {
    mockReuse.mockResolvedValue({
      ok: true,
      browse_receipt: "jwt-browse",
      browse_receipt_id: "br_integration",
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
    expect(result.redirect_url).toContain("browse-verification-result");
    expect(mockCreateRequest).not.toHaveBeenCalled();
  });
});
