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

export const GOOD_TROUBLE_PURCHASE_INTRO =
  "Good Trouble wants to confirm you're 21 or older. Verify your age privately — Good Trouble receives only whether you meet the 21+ requirement, not your birth date or identity documents." as const;

export const GOOD_TROUBLE_PURCHASE_VERIFY_ACTION = "Verify my age" as const;

export const GOOD_TROUBLE_PURCHASE_REUSE_ACTION = "Use my existing verification" as const;
