// FILE: lib/partner/integrationKit/outcomes.ts
// Map fail-closed receipt errors to the Integration Kit result enum.

import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";

export function outcomeFromValidationErrors(errors: string[]): PartnerIntegrationOutcome {
  const blob = errors.join(" ").toLowerCase();
  if (errors.some((error) => error.includes("expired") || error === "expires_at_missing" || error === "expires_at_invalid" || error.startsWith("status_not_active:expired"))) {
    return "expired";
  }
  if (errors.some((error) => error.includes("revoked") || error === "receipt_revoked" || error.startsWith("status_not_active:revoked"))) {
    return "revoked";
  }
  if (errors.some((error) => error.startsWith("decision_not_approved"))) {
    return "denied";
  }
  if (blob.includes("fetch") || errors.includes("receipt_fetch_failed") || errors.includes("retry")) {
    return "retry";
  }
  return "invalid";
}
