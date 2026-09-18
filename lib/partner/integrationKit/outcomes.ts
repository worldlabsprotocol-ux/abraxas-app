// FILE: lib/partner/integrationKit/outcomes.ts
// Map fail-closed receipt errors to the Integration Kit result enum.

import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";

function matches(errors: string[], needles: string[]): boolean {
  return errors.some((error) => needles.some((needle) => error === needle || error.startsWith(`${needle}:`) || error.includes(needle)));
}

export function outcomeFromValidationErrors(errors: string[]): PartnerIntegrationOutcome {
  const blob = errors.join(" ").toLowerCase();
  if (blob.includes("fetch") || errors.includes("receipt_fetch_failed") || errors.includes("retry")) {
    return "retry";
  }
  if (errors.some((error) => error.includes("expired") || error === "expires_at_missing" || error === "expires_at_invalid" || error.startsWith("status_not_active:expired"))) {
    return "expired";
  }
  if (errors.some((error) => error.includes("revoked") || error === "receipt_revoked" || error.startsWith("status_not_active:revoked"))) {
    return "revoked";
  }
  if (errors.some((error) => error.startsWith("decision_not_approved"))) {
    return "denied";
  }
  if (matches(errors, ["signature_invalid"])) {
    return "invalid_signature";
  }
  if (matches(errors, ["partner_mismatch", "policy_wrong_partner"])) {
    return "wrong_partner";
  }
  if (matches(errors, ["policy_version_draft", "policy_draft_not_issuable"])) {
    return "policy_version_draft";
  }
  if (matches(errors, ["policy_version_deprecated"])) {
    return "policy_version_deprecated";
  }
  if (matches(errors, ["policy_version_unknown"])) {
    return "policy_version_unknown";
  }
  if (matches(errors, ["policy_version_not_yet_effective"])) {
    return "policy_version_not_yet_effective";
  }
  if (matches(errors, ["policy_version_not_adopted"])) {
    return "policy_version_not_adopted";
  }
  if (matches(errors, ["policy_version_missing"])) {
    return "policy_version_missing";
  }
  if (matches(errors, ["policy_version_mismatch", "policy_version_mismatched"])) {
    return "wrong_policy_version";
  }
  if (matches(errors, ["policy_mismatch"])) {
    return "wrong_policy";
  }
  if (
    matches(errors, [
      "environment_mismatch",
      "production_not_usable",
      "production_usable_not_true",
      "production_usable_missing",
      "sandbox_only",
    ])
  ) {
    return "environment_mismatch";
  }
  return "invalid";
}
