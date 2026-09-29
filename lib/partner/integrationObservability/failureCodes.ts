// FILE: lib/partner/integrationObservability/failureCodes.ts
// Partner-safe failure codes derived from integration kit / flow errors.

import type { PartnerSafeFailureCode } from "./contract";

export function partnerSafeFailureCode(errors: string[], outcome?: string): PartnerSafeFailureCode {
  const blob = errors.join(" ").toLowerCase();
  if (errors.includes("receipt_missing") || blob.includes("receipt_missing")) return "receipt_missing";
  if (blob.includes("expired") || outcome === "expired") return "receipt_expired";
  if (blob.includes("receipt_superseded") || outcome === "superseded") return "receipt_superseded";
  if (blob.includes("evidence_refresh") || blob.includes("claim_expired") || blob.includes("claim_revoked")) {
    return "evidence_refresh_required";
  }
  if (blob.includes("policy_no_longer_valid") || outcome === "policy_version_deprecated") return "policy_no_longer_valid";
  if (blob.includes("application_inactive")) return "application_inactive";
  if (blob.includes("revoked") || outcome === "revoked") return "receipt_revoked";
  if (blob.includes("partner_mismatch") || outcome === "wrong_partner") return "partner_mismatch";
  if (blob.includes("policy_version_mismatch") || outcome === "wrong_policy_version") return "policy_version_mismatch";
  if (blob.includes("policy_mismatch") || outcome === "wrong_policy") return "policy_mismatch";
  if (blob.includes("request_correlation") || outcome === "wrong_request_correlation") return "request_mismatch";
  if (blob.includes("callback") || outcome === "invalid") return "callback_invalid";
  if (blob.includes("credential_revoked")) return "credential_revoked";
  if (blob.includes("credential")) return "credential_invalid";
  if (blob.includes("production_not") || outcome === "environment_mismatch") return "production_not_active";
  if (blob.includes("denied") || outcome === "denied") return "policy_denied";
  if (blob.includes("rate_limited")) return "rate_limited";
  if (blob.includes("signature") || outcome === "invalid_signature") return "receipt_invalid";
  if (outcome === "retry" || blob.includes("fetch")) return "verification_incomplete";
  return "unknown";
}
