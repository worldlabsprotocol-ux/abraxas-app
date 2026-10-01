// FILE: lib/partner/goodTroublePurchaseFlow.ts
// Canonical Good Trouble 21+ purchase holder experience (not browse, not legacy sandbox).

import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";

export function isCanonicalGoodTroublePurchaseFlow(input: {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
}): boolean {
  if (input.partnerId.trim() !== GOOD_TROUBLE_CANONICAL_PARTNER_ID) return false;
  if (input.policyId.trim() !== GOOD_TROUBLE_CANONICAL_POLICY_ID) return false;
  const purpose = input.purpose?.trim();
  if (purpose === "browse") return false;
  return true;
}

export const GOOD_TROUBLE_PURCHASE_TITLE = "Confirm you're 21+" as const;

export const GOOD_TROUBLE_PURCHASE_DOB_INTRO =
  "Good Trouble only needs to know whether you're 21 or older. Your birth date and identity documents stay private." as const;

export const GOOD_TROUBLE_PURCHASE_VERIFY_INTRO =
  "We need to verify that the age information is yours. Good Trouble still receives only your 21+ result." as const;

export const GOOD_TROUBLE_PURCHASE_DOB_CONTINUE = "Continue" as const;

export const GOOD_TROUBLE_PURCHASE_VERIFY_ACTION = "Verify my age" as const;

export const GOOD_TROUBLE_PURCHASE_REUSE_ACTION = "Use existing verification" as const;

export const GOOD_TROUBLE_PURCHASE_SHARE_TITLE = "Ready to share" as const;

export const GOOD_TROUBLE_PURCHASE_SHARE_ACTION = "Share 21+ result" as const;

export const GOOD_TROUBLE_PURCHASE_DONE_TITLE = "Verification complete" as const;

export const GOOD_TROUBLE_PURCHASE_UNDER_21_TITLE = "Not eligible" as const;

export const GOOD_TROUBLE_PURCHASE_UNDER_21_MESSAGE =
  "You must be 21 or older to continue with Good Trouble." as const;

/** @deprecated Use GOOD_TROUBLE_PURCHASE_DOB_INTRO */
export const GOOD_TROUBLE_PURCHASE_INTRO = GOOD_TROUBLE_PURCHASE_DOB_INTRO;
