import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";

type PartnerSetupVisibilityInput = {
  partnerId: string;
  walletReady: boolean;
  walletBound: boolean;
  identityComplete: boolean;
  underReview: boolean;
};

/** Wallet binding is optional for Good Trouble's age-eligibility flow. */
export function resolvePartnerSetupVisibility({
  partnerId,
  walletReady,
  walletBound,
  identityComplete,
  underReview,
}: PartnerSetupVisibilityInput) {
  return {
    showWalletBinding:
      walletReady && !walletBound && partnerId !== GOOD_TROUBLE_PARTNER_ID,
    showIdentityVerification:
      walletReady && !identityComplete && !underReview,
  };
}

