// FILE: lib/partner/normalizePartnerVerifyInput.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_BROWSE_RC_PARAM,
  GOOD_TROUBLE_BROWSE_RC_VALUE,
  GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE,
  isLegacyGoodTroubleBrowseReturnUrl,
  normalizeGoodTroubleBrowseReturnUrl,
  normalizePartnerVerifyInput,
  normalizePartnerVerifySearchParams,
} from "./normalizePartnerVerifyInput";
import { buildBrowseReturnUrl } from "@/lib/assurance/selfAttestation/reuseBrowseSelfAttestation";

const GTB_FLOW_ID = `gtb_${"a".repeat(64)}`;

const LEGACY_BROWSE_RETURN_URL =
  `https://www.goodtroublecanna.com/browse-verification-result?gtb=${GTB_FLOW_ID}`;

const NORMALIZED_BROWSE_RETURN_URL =
  `https://www.goodtroublecanna.com/browse-verification-result?gtb=${GTB_FLOW_ID}&rc=test-site`;

const LEGACY_VERIFY_SEARCH = new URLSearchParams({
  partner_id: GOOD_TROUBLE_PARTNER_ID,
  return_url: LEGACY_BROWSE_RETURN_URL,
});

describe("normalizePartnerVerifyInput legacy Good Trouble browse", () => {
  it("normalizes missing policy_id and purpose for exact legacy browse callback", () => {
    const result = normalizePartnerVerifySearchParams(LEGACY_VERIFY_SEARCH);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.legacyBrowseNormalized).toBe(true);
    expect(result.params).toEqual({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: NORMALIZED_BROWSE_RETURN_URL,
    });
  });

  it("detects legacy browse return URL shape", () => {
    expect(isLegacyGoodTroubleBrowseReturnUrl(LEGACY_BROWSE_RETURN_URL)).toBe(true);
  });

  it("rejects purchase callback path", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result?gtv=gtf_" + "b".repeat(64),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.invalidLinkMessage).toBe(GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE);
    expect(result.code).toBe("purchase_callback");
  });

  it("rejects gtf_ token in browse-shaped return URL", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      returnUrl: `https://www.goodtroublecanna.com/browse-verification-result?gtb=gtf_${"b".repeat(64)}`,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(["purchase_callback", "malformed_gtb"]).toContain(result.code);
  });

  it("rejects foreign return host", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      returnUrl: `https://evil.example/browse-verification-result?gtb=${GTB_FLOW_ID}`,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("foreign_return_host");
  });

  it("rejects malformed gtb token on browse callback", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      returnUrl: "https://www.goodtroublecanna.com/browse-verification-result?gtb=short",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("malformed_gtb");
  });

  it("rejects explicit retail policy with browse purpose", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "browse",
      returnUrl: LEGACY_BROWSE_RETURN_URL,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("tuple_conflict");
  });

  it("never infers browse from partner name alone", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      returnUrl: "https://www.goodtroublecanna.com/",
    });

    expect(result.ok).toBe(false);
  });

  it("adds rc=test-site for explicit browse tuple missing rc", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: LEGACY_BROWSE_RETURN_URL,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.legacyBrowseNormalized).toBe(false);
    expect(result.params.returnUrl).toBe(NORMALIZED_BROWSE_RETURN_URL);

    const parsed = new URL(result.params.returnUrl);
    expect(parsed.pathname).toBe("/browse-verification-result");
    expect(parsed.searchParams.get("gtb")).toBe(GTB_FLOW_ID);
    expect(parsed.searchParams.get(GOOD_TROUBLE_BROWSE_RC_PARAM)).toBe(GOOD_TROUBLE_BROWSE_RC_VALUE);
  });

  it("normalizes rc=test-site regardless of query parameter order", () => {
    const reversed = `https://www.goodtroublecanna.com/browse-verification-result?rc=other&gtb=${GTB_FLOW_ID}`;
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: reversed,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = new URL(result.params.returnUrl);
    expect(parsed.searchParams.get("gtb")).toBe(GTB_FLOW_ID);
    expect(parsed.searchParams.get(GOOD_TROUBLE_BROWSE_RC_PARAM)).toBe(GOOD_TROUBLE_BROWSE_RC_VALUE);
  });

  it("leaves purchase callback URLs unchanged", () => {
    const purchaseUrl =
      `https://www.goodtroublecanna.com/age-verification-result?gtv=gtf_${"c".repeat(64)}`;
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "purchase",
      returnUrl: purchaseUrl,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params.returnUrl).toBe(purchaseUrl);
    expect(result.params.returnUrl).not.toContain("rc=test-site");
  });

  it("does not add rc=test-site to foreign-host browse-shaped callbacks", () => {
    const foreignUrl = `https://abraxas-app.vercel.app/browse-verification-result?gtb=${GTB_FLOW_ID}`;
    expect(normalizeGoodTroubleBrowseReturnUrl(foreignUrl)).toBe(foreignUrl);

    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: foreignUrl,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("foreign_return_host");
  });

  it("buildBrowseReturnUrl retains rc, gtb, and receipt parameters", () => {
    const redirect = buildBrowseReturnUrl(LEGACY_BROWSE_RETURN_URL, {
      browseReceipt: "jwt-token",
      browseReceiptId: "br_existing",
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
    });
    expect(redirect).not.toBeNull();
    if (!redirect) return;

    const parsed = new URL(redirect);
    expect(parsed.searchParams.get("gtb")).toBe(GTB_FLOW_ID);
    expect(parsed.searchParams.get(GOOD_TROUBLE_BROWSE_RC_PARAM)).toBe(GOOD_TROUBLE_BROWSE_RC_VALUE);
    expect(parsed.searchParams.get("browse_receipt")).toBe("jwt-token");
    expect(parsed.searchParams.get("browse_receipt_id")).toBe("br_existing");
    expect(parsed.searchParams.get("purpose")).toBe("browse");
    expect(parsed.searchParams.get("policy_id")).toBe(GOOD_TROUBLE_BROWSE_POLICY_ID);
  });

  it("normalizeGoodTroubleBrowseReturnUrl is idempotent", () => {
    const once = normalizeGoodTroubleBrowseReturnUrl(LEGACY_BROWSE_RETURN_URL);
    const twice = normalizeGoodTroubleBrowseReturnUrl(once);
    expect(once).toBe(twice);
    expect(once).toBe(NORMALIZED_BROWSE_RETURN_URL);
  });
});
