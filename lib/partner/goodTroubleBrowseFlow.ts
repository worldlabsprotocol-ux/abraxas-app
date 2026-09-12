// FILE: lib/partner/goodTroubleBrowseFlow.ts
// Good Trouble tier-1 browse (L0 DOB-first) flow detection.

import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

export function isGoodTroubleBrowseFlow(input: {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
}): boolean {
  return (
    input.partnerId === GOOD_TROUBLE_PARTNER_ID
    && input.policyId === GOOD_TROUBLE_BROWSE_POLICY_ID
    && input.purpose === "browse"
  );
}

export const GOOD_TROUBLE_BROWSE_INTRO =
  "Confirm you're 21+ without sharing your birthday with Good Trouble.";

export const GOOD_TROUBLE_BROWSE_STATUS =
  "One quick step, then we'll send you back.";
