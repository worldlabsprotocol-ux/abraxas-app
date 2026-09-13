// FILE: lib/partner/goodTroubleBrowseFlow.ts
// Good Trouble tier-1 browse (L0 DOB-first) flow detection.

import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";

export class GoodTroubleFlowTupleMismatchError extends Error {
  readonly code = "flow_tuple_mismatch" as const;

  constructor(message: string) {
    super(message);
    this.name = "GoodTroubleFlowTupleMismatchError";
  }
}

/**
 * Authoritative Good Trouble browse detection.
 * Browse policy implies browse purpose when purpose is absent (OAuth resume may drop it).
 * Tuple mismatches must fail closed — never silently open purchase verification.
 */
export function isGoodTroubleBrowseFlow(input: {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
}): boolean {
  if (input.partnerId !== GOOD_TROUBLE_PARTNER_ID) return false;
  if (input.policyId !== GOOD_TROUBLE_BROWSE_POLICY_ID) return false;

  const purpose = input.purpose?.trim();
  if (purpose === "purchase") return false;
  if (purpose && purpose !== "browse") return false;
  return true;
}

/**
 * Normalize and validate the Good Trouble partner flow tuple before evaluate/continue.
 * @returns Resolved purpose ("browse" | "purchase") for storage and redirects.
 */
export function resolveGoodTroubleFlowPurpose(input: {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
  returnUrl?: string | null;
}): "browse" | "purchase" | null {
  if (input.partnerId !== GOOD_TROUBLE_PARTNER_ID) return null;

  const purpose = input.purpose?.trim() || null;
  const returnUrl = input.returnUrl?.trim() || "";

  if (input.policyId === GOOD_TROUBLE_BROWSE_POLICY_ID) {
    if (purpose === "purchase") {
      throw new GoodTroubleFlowTupleMismatchError(
        "Browse policy cannot be combined with purchase purpose",
      );
    }
    if (purpose && purpose !== "browse") {
      throw new GoodTroubleFlowTupleMismatchError(
        `Unsupported purpose "${purpose}" for browse policy`,
      );
    }
    if (returnUrl) {
      const normalized = returnUrl.toLowerCase();
      if (
        normalized.includes("age-verification-result")
        || normalized.includes("gtf_")
        || normalized.includes("good-trouble-retail-v1")
      ) {
        throw new GoodTroubleFlowTupleMismatchError(
          "Browse policy requires a browse callback return URL",
        );
      }
    }
    return "browse";
  }

  if (input.policyId === GOOD_TROUBLE_RETAIL_POLICY_ID) {
    if (purpose === "browse") {
      throw new GoodTroubleFlowTupleMismatchError(
        "Retail policy cannot be combined with browse purpose",
      );
    }
    if (returnUrl) {
      const normalized = returnUrl.toLowerCase();
      if (
        normalized.includes("browse-verification-result")
        || normalized.includes("gtb_")
        || normalized.includes("good-trouble-browse-v1")
      ) {
        throw new GoodTroubleFlowTupleMismatchError(
          "Retail policy requires a purchase callback return URL",
        );
      }
    }
    return "purchase";
  }

  return null;
}

export const GOOD_TROUBLE_BROWSE_INTRO =
  "A private age check for Good Trouble.";

export const GOOD_TROUBLE_BROWSE_STATUS =
  "Good Trouble receives only a yes-or-no 21+ result.";

/** Minimal /partner/continue browse screen copy. */
export const GOOD_TROUBLE_BROWSE_EYEBROW = "PRIVATE AGE CHECK";

export const GOOD_TROUBLE_BROWSE_HEADING = "Confirm you're 21+";

export const GOOD_TROUBLE_BROWSE_SUPPORTING =
  "Enter your birthday once. Good Trouble receives only a yes-or-no result.";

export const GOOD_TROUBLE_BROWSE_DOB_HEADING = "Enter your birthday";

export const GOOD_TROUBLE_BROWSE_PRIMARY_BUTTON = "Continue";

export const GOOD_TROUBLE_BROWSE_TRADITIONAL_FALLBACK =
  "Use Good Trouble's age check";

export const GOOD_TROUBLE_BROWSE_CHECKING_STATE = "Checking your age…";

export const GOOD_TROUBLE_BROWSE_SUCCESS_STATE =
  "Confirmed. Returning to Good Trouble…";

export const GOOD_TROUBLE_BROWSE_PROHIBITED_UI_PHRASES = [
  "Return pending",
  "Complete the steps above",
  "Signing in confirms your account only",
  "wallet binding",
  "assurance level",
  "self-attestation",
  "L0",
  "policy result",
  "verification requirement",
] as const;

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
