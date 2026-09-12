import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { resolvePartnerSetupVisibility } from "@/lib/partner/partnerSetupVisibility";

describe("resolvePartnerSetupVisibility", () => {
  it("shows DOB-first browse form for Good Trouble browse without wallet binding", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: false,
    })).toEqual({
      showWalletBinding: false,
      showIdentityVerification: false,
      showDobFirstBrowseForm: true,
    });
  });

  it("keeps regulated purchase verification for Good Trouble retail policy", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "purchase",
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: false,
    })).toEqual({
      showWalletBinding: false,
      showIdentityVerification: true,
      showDobFirstBrowseForm: false,
    });
  });

  it("does not let optional wallet binding block another partner's identity step", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: "example-partner",
      policyId: "example-policy",
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: false,
    })).toEqual({
      showWalletBinding: true,
      showIdentityVerification: true,
      showDobFirstBrowseForm: false,
    });
  });

  it("hides identity setup during review and after completion", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: true,
    }).showDobFirstBrowseForm).toBe(false);

    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      purpose: "purchase",
      walletReady: true,
      walletBound: false,
      identityComplete: true,
      underReview: false,
    }).showIdentityVerification).toBe(false);
  });
});
