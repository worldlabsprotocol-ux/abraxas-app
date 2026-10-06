// FILE: lib/partner/goodTroublePurchaseFlow.ts
// Canonical Good Trouble 21+ purchase holder experience (not browse, not legacy sandbox).

import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

/** Regulated Good Trouble purchase policies — legacy sandbox and canonical production. */
export function isGoodTroubleRegulatedPurchasePolicyId(policyId: string): boolean {
  const id = policyId.trim();
  return id === GOOD_TROUBLE_RETAIL_POLICY_ID || id === GOOD_TROUBLE_CANONICAL_POLICY_ID;
}

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

/** Truthful L0 copy — not government-ID or POS ID verification. */
export const GOOD_TROUBLE_PURCHASE_CONTEXT =
  "Order eligibility — Good Trouble receives only your 21+ result." as const;

export const GOOD_TROUBLE_PURCHASE_DOB_INTRO =
  "Enter your birthday to confirm 21+ eligibility. Your birth date stays private and is not shared with Good Trouble." as const;

export const GOOD_TROUBLE_PURCHASE_VERIFY_INTRO =
  "Good Trouble receives only a yes or no 21+ result — not your birth date or identity documents." as const;

export const GOOD_TROUBLE_PURCHASE_VERIFY_HEADING = "Confirm 21+ eligibility" as const;

export const GOOD_TROUBLE_PURCHASE_DOB_CONTINUE = "Continue" as const;

export const GOOD_TROUBLE_PURCHASE_VERIFY_ACTION = "Continue" as const;

export const GOOD_TROUBLE_PURCHASE_REUSE_ACTION = "Use existing 21+ result" as const;

export const GOOD_TROUBLE_PURCHASE_SHARE_TITLE = "Ready to share" as const;

export const GOOD_TROUBLE_PURCHASE_SHARE_ACTION = "Share 21+ result" as const;

export const GOOD_TROUBLE_PURCHASE_DONE_TITLE = "Verification complete" as const;

export const GOOD_TROUBLE_PURCHASE_UNDER_21_TITLE = "Not eligible" as const;

export const GOOD_TROUBLE_PURCHASE_UNDER_21_MESSAGE =
  "You must be 21 or older to continue with Good Trouble." as const;

/** @deprecated Use GOOD_TROUBLE_PURCHASE_DOB_INTRO */
export const GOOD_TROUBLE_PURCHASE_INTRO = GOOD_TROUBLE_PURCHASE_DOB_INTRO;
