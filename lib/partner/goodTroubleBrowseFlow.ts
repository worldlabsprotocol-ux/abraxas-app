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

/** Sign-in screen copy for the DOB-first browse journey (before Google/zkLogin). */
export const GOOD_TROUBLE_BROWSE_SIGN_IN_INTRO =
  "Create a private Passport for faster future access.";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_STATUS =
  "Sign in once, then enter your birthday. We'll save only that you're 21 or older.";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_BUTTON = "Create or open my Passport";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_HEADING = "What you get";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_VALUE_COPY =
  "Your 21+ status can be reused on future visits. Abraxas also prepares a private wallet for features Good Trouble may offer later.";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_PRIVACY_COPY =
  "Good Trouble does not receive your Google password or birthday.";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_CLARIFICATION =
  "This creates an Abraxas Passport. A Good Trouble customer account can be added separately in the future.";

export const GOOD_TROUBLE_BROWSE_SIGN_IN_PROHIBITED_PHRASES = [
  "Signing in is not age verification",
  "Google sign-in confirms your account only",
  "policy result",
  "verification requirement",
  "regulated purchase",
  "government ID",
  "self-attestation",
  "L0",
  "wallet binding",
  "Sui",
  "seed phrase",
] as const;
