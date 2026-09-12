import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";
import { resolvePartnerSetupVisibility } from "@/lib/partner/partnerSetupVisibility";

describe("resolvePartnerSetupVisibility", () => {
  it("sends Good Trouble directly to identity verification without wallet binding", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: false,
    })).toEqual({
      showWalletBinding: false,
      showIdentityVerification: true,
    });
  });

  it("does not let optional wallet binding block another partner's identity step", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: "example-partner",
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: false,
    })).toEqual({
      showWalletBinding: true,
      showIdentityVerification: true,
    });
  });

  it("hides identity setup during review and after completion", () => {
    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      walletReady: true,
      walletBound: false,
      identityComplete: false,
      underReview: true,
    }).showIdentityVerification).toBe(false);

    expect(resolvePartnerSetupVisibility({
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      walletReady: true,
      walletBound: false,
      identityComplete: true,
      underReview: false,
    }).showIdentityVerification).toBe(false);
  });
});

