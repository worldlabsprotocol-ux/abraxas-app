// @vitest-environment jsdom
// FILE: lib/partner/goodTroubleBrowseOAuthContinue.integration.test.ts
// End-to-end regression: Wix browse URL → OAuth resume → evaluate → continue DOB → return.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_BROWSE_HEADING,
  GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON,
  GOOD_TROUBLE_BROWSE_PROHIBITED_UI_PHRASES,
} from "@/lib/partner/goodTroubleBrowseFlow";
import {
  buildPartnerVerifyPath,
  consumePartnerVerifyResumePath,
  savePartnerVerifyResume,
} from "@/lib/partner/partnerVerifyResume";
import { resolvePartnerContinueContext } from "@/lib/partner/resolvePartnerContinueContext";

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

import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";
import { resolveGoodTroubleFlowPurpose } from "@/lib/partner/goodTroubleBrowseFlow";

const BROWSE_RETURN_URL =
  "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_" + "a".repeat(64);

const WIX_BROWSE_VERIFY_URL =
  `https://abraxasworld.xyz/partner/verify?partner_id=${GOOD_TROUBLE_PARTNER_ID}`
  + `&policy_id=${GOOD_TROUBLE_BROWSE_POLICY_ID}`
  + `&purpose=browse`
  + `&return_url=${encodeURIComponent(BROWSE_RETURN_URL)}`;

const PURCHASE_UI_PHRASES = [
  "Verify eligibility for purchase",
  "Continue with ID Verification",
  "Use Good Trouble's age check",
  "Return pending",
];

describe("Good Trouble browse OAuth → continue integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_BROWSE_POLICY_ID,
      version: 1,
      rules_json: { browse_access_only: true },
    });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-oauth-browse-1" });
    mockReuse.mockResolvedValue({ ok: false, code: "no_reusable_browse_proof" });
  });

  it("preserves browse tuple through OAuth resume when purpose drops from restored URL", () => {
    savePartnerVerifyResume({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: BROWSE_RETURN_URL,
      purpose: "browse",
    });

    const restored = consumePartnerVerifyResumePath();
    expect(restored).toContain("policy_id=good-trouble-browse-v1");
    expect(restored).toContain(`partner_id=${GOOD_TROUBLE_PARTNER_ID}`);

    const resumedWithoutPurpose = buildPartnerVerifyPath({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: BROWSE_RETURN_URL,
    });
    expect(resumedWithoutPurpose).not.toContain("purpose=browse");
    expect(resumedWithoutPurpose).toContain("policy_id=good-trouble-browse-v1");
  });

  it("evaluate request body resolves browse purpose and persists browse policy + purpose", async () => {
    const resumedPath = buildPartnerVerifyPath({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: BROWSE_RETURN_URL,
    });
    const resumedParams = new URL(resumedPath, "https://abraxasworld.xyz").searchParams;

    const evaluateBody = {
      relying_party_id: resumedParams.get("partner_id"),
      policy_id: resumedParams.get("policy_id"),
      purpose: resumedParams.get("purpose") || undefined,
      return_url: resumedParams.get("return_url"),
    };

    expect(evaluateBody.policy_id).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(evaluateBody.purpose).toBeUndefined();

    const resolvedPurpose = resolveGoodTroubleFlowPurpose({
      partnerId: evaluateBody.relying_party_id ?? "",
      policyId: evaluateBody.policy_id ?? "",
      purpose: evaluateBody.purpose,
      returnUrl: evaluateBody.return_url ?? "",
    });
    expect(resolvedPurpose).toBe("browse");

    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: resolvedPurpose ?? undefined,
      returnUrl: BROWSE_RETURN_URL,
    });

    expect(result.next).toBe("passport");
    expect(mockCreateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      }),
    );

    const continueUrl = new URL(result.passport_url ?? "", "https://abraxasworld.xyz");
    expect(continueUrl.pathname).toBe("/partner/continue");
    expect(continueUrl.searchParams.get("verify_request")).toBe("vr-oauth-browse-1");
    expect(continueUrl.searchParams.get("policy_id")).toBeNull();
    expect(continueUrl.searchParams.get("return")).toBeNull();
    expect(continueUrl.searchParams.get("return_url")).toBeNull();
  });

  it("/partner/continue resolves browse DOB mode from authoritative stored request", () => {
    const continueContext = resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: null,
        returnUrl: BROWSE_RETURN_URL,
        verifyRequestId: "vr-oauth-browse-1",
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      },
    );

    expect(continueContext.isDobFirstBrowse).toBe(true);
    expect(continueContext.purpose).toBe("browse");
    expect(continueContext.policyId).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
  });

  it("auto-returns returning users with reusable browse proof", async () => {
    mockReuse.mockResolvedValue({
      ok: true,
      browse_receipt: "jwt-browse-oauth",
      browse_receipt_id: "br_oauth",
      expires_at: "2099-01-01T00:00:00.000Z",
      age_band: "over_21",
    });

    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: BROWSE_RETURN_URL,
    });

    expect(result.next).toBe("enter");
    expect(result.redirect_url).toContain("browse-verification-result");
    expect(result.redirect_url).toContain("browse_receipt=jwt-browse-oauth");
    expect(mockCreateRequest).not.toHaveBeenCalled();
  });

  it("Wix browse verify URL contains the required tuple", () => {
    const url = new URL(WIX_BROWSE_VERIFY_URL);
    expect(url.searchParams.get("partner_id")).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(url.searchParams.get("policy_id")).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
    expect(url.searchParams.get("purpose")).toBe("browse");
    expect(url.searchParams.get("return_url")).toContain("gtb_");
    expect(url.searchParams.get("return_url")).toContain("browse-verification-result");
  });

  it("browse continue copy never includes purchase UI phrases", () => {
    const browseCopy = [
      GOOD_TROUBLE_BROWSE_HEADING,
      GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON,
    ].join(" ");

    for (const phrase of PURCHASE_UI_PHRASES) {
      expect(browseCopy).not.toContain(phrase);
    }
    expect(GOOD_TROUBLE_BROWSE_PROHIBITED_UI_PHRASES).toContain("Return pending");
  });
});
