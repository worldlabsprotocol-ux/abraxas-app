import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  derivePurposeFromAuthoritativePolicy,
  resolvePartnerContinueContext,
} from "./resolvePartnerContinueContext";

const RETURN_URL = "https://www.goodtroublecanna.com/browse-verification-result";

describe("derivePurposeFromAuthoritativePolicy", () => {
  it("maps browse policy to browse purpose", () => {
    expect(derivePurposeFromAuthoritativePolicy({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      urlPurpose: null,
    })).toBe("browse");
  });

  it("never maps retail policy to browse even when URL says browse", () => {
    expect(derivePurposeFromAuthoritativePolicy({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      urlPurpose: "browse",
    })).toBe("purchase");
  });
});

describe("resolvePartnerContinueContext", () => {
  it("enables DOB-first browse when server verification request is browse policy", () => {
    const resolved = resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: null,
        returnUrl: RETURN_URL,
        verifyRequestId: "vr-1",
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      },
    );

    expect(resolved.purpose).toBe("browse");
    expect(resolved.isDobFirstBrowse).toBe(true);
    expect(resolved.authoritative).toBe(true);
  });

  it("does not enable DOB-first browse for retail policy with browse URL purpose", () => {
    const resolved = resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        purpose: "browse",
        returnUrl: RETURN_URL,
        verifyRequestId: "vr-2",
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      },
    );

    expect(resolved.isDobFirstBrowse).toBe(false);
    expect(resolved.purpose).toBe("purchase");
  });

  it("derives browse mode from browse policy when purpose is missing from URL", () => {
    expect(resolvePartnerContinueContext({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: null,
      returnUrl: RETURN_URL,
      verifyRequestId: null,
    }).isDobFirstBrowse).toBe(true);

    expect(resolvePartnerContinueContext({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      returnUrl: RETURN_URL,
      verifyRequestId: null,
    }).isDobFirstBrowse).toBe(true);
  });

  it("prefers stored verification-request purpose when authoritative", () => {
    const resolved = resolvePartnerContinueContext(
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: null,
        returnUrl: RETURN_URL,
        verifyRequestId: "vr-3",
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
        purpose: "browse",
      },
    );

    expect(resolved.purpose).toBe("browse");
    expect(resolved.isDobFirstBrowse).toBe(true);
  });
});
