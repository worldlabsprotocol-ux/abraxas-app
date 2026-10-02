import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";
import { isGoodTroubleBrowseFlow } from "@/lib/partner/goodTroubleBrowseFlow";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";

type PartnerSetupVisibilityInput = {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
  walletReady: boolean;
  walletBound: boolean;
  identityComplete: boolean;
  underReview: boolean;
};

/** Wallet binding is optional for Good Trouble's age-eligibility flow. */
export function resolvePartnerSetupVisibility({
  partnerId,
  policyId,
  purpose,
  walletReady,
  walletBound,
  identityComplete,
  underReview,
}: PartnerSetupVisibilityInput) {
  const dobFirstBrowse = isGoodTroubleBrowseFlow({ partnerId, policyId, purpose });
  const canonicalPurchase = isCanonicalGoodTroublePurchaseFlow({ partnerId, policyId, purpose });

  return {
    showWalletBinding:
      walletReady
      && !walletBound
      && !dobFirstBrowse
      && !canonicalPurchase
      && partnerId !== GOOD_TROUBLE_PARTNER_ID,
    showIdentityVerification:
      walletReady && !identityComplete && !underReview && !dobFirstBrowse && !canonicalPurchase,
    showDobFirstBrowseForm: walletReady && dobFirstBrowse && !underReview,
  };
}
