// FILE: lib/partner/normalizePartnerVerifyInput.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE,
  isLegacyGoodTroubleBrowseReturnUrl,
  normalizePartnerVerifyInput,
  normalizePartnerVerifySearchParams,
} from "./normalizePartnerVerifyInput";

const GTB_FLOW_ID = `gtb_${"a".repeat(64)}`;

const LEGACY_BROWSE_RETURN_URL =
  `https://www.goodtroublecanna.com/browse-verification-result?gtb=${GTB_FLOW_ID}`;

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
      returnUrl: LEGACY_BROWSE_RETURN_URL,
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

  it("passes through explicit browse tuple unchanged", () => {
    const result = normalizePartnerVerifyInput({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: LEGACY_BROWSE_RETURN_URL,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.legacyBrowseNormalized).toBe(false);
  });
});
