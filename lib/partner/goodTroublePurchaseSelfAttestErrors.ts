// FILE: lib/partner/goodTroublePurchaseSelfAttestErrors.ts
// Safe holder-facing messages for Good Trouble purchase self-attestation failures.

import { holderSafeClientMessage } from "@/lib/partner/holderExperience/recovery";

const PURCHASE_ATTEST_ERRORS: Record<string, string> = {
  purpose_not_allowed: "This eligibility step could not be started. Return to Good Trouble and open verification again.",
  purpose_policy_mismatch: "This verification link does not match the current eligibility policy. Start again from Good Trouble.",
  policy_not_self_attest_eligible: "This verification policy does not support age eligibility here. Return to Good Trouble and try again.",
  policy_not_found: "This verification policy is unavailable. Return to Good Trouble and try again.",
  partner_policy_mismatch: "This verification link does not match Good Trouble. Start again from ORDER NOW.",
  insert_failed: "Your age eligibility could not be saved. Try again in a moment.",
  auth_required: "Your session expired. Return to Good Trouble and open verification again.",
  origin_not_allowed: "This page could not confirm your request. Return to Good Trouble and try again.",
  origin_required: "This page could not confirm your request. Return to Good Trouble and try again.",
  invalid_dob: "Enter a valid date of birth.",
  dob_in_future: "Enter a valid date of birth.",
  dob_too_old: "Enter a valid date of birth.",
};

const PURCHASE_RETURN_ERRORS: Record<string, string> = {
  missing_flow_token:
    "Good Trouble could not confirm this checkout session. Return to Good Trouble, tap ORDER NOW again, and finish verification in the same browser tab where you started.",
  open_redirect:
    "This return link does not match your Good Trouble checkout. Start again from ORDER NOW on Good Trouble.",
  stale:
    "This verification session expired. Return to Good Trouble and open a fresh verification link.",
  missing:
    "We could not find your return link. Return to Good Trouble and open verification again from ORDER NOW.",
};

export function mapGoodTroublePurchaseReturnError(code?: string | null): string {
  if (!code) return holderSafeClientMessage();
  return PURCHASE_RETURN_ERRORS[code] ?? holderSafeClientMessage();
}

export function mapGoodTroublePurchaseAttestError(code?: string | null): string {
  if (!code) return holderSafeClientMessage();
  return PURCHASE_ATTEST_ERRORS[code] ?? holderSafeClientMessage();
}

export function mapGoodTroublePurchaseQualifyError(code?: string | null): string {
  if (code === "method_not_qualified") {
    return "Your 21+ eligibility could not be confirmed yet. Try entering your birthday again.";
  }
  if (code === "canonical_age_eligibility_path") {
    return "This verification path is not available. Return to Good Trouble and try again.";
  }
  return holderSafeClientMessage();
}
