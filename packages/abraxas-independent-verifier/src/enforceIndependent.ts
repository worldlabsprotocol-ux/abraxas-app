import type { IndependentVerificationResult } from "./verifyIndependent";

export type IndependentEnforcementAction = "permit" | "deny" | "indeterminate";

/** Mandatory failures — must never yield permit. */
export const MANDATORY_DENY_FAILURE_CODES = new Set<string>([
  "statement_stale",
  "status_statement_stale",
  "payload_tampered",
  "signature_invalid",
  "not_currently_acceptable",
  "audience_mismatch",
  "status_partner_mismatch",
  "status_policy_mismatch",
  "statement_payload_hash_mismatch",
  "cross_environment",
  "unsigned_status_evidence_rejected",
]);

/** Trust not established — permit is forbidden; action is indeterminate. */
export const MANDATORY_INDETERMINATE_FAILURE_CODES = new Set<string>([
  "statement_freshness_unknown",
  "signed_status_evidence_required",
  "bundled_trust_anchor_not_authenticated",
  "anchor_fingerprint_mismatch",
]);

export function enforcementFromIndependentVerification(result: IndependentVerificationResult): {
  action: IndependentEnforcementAction;
  failure_codes: string[];
} {
  const failure_codes = result.failure_codes;

  if (failure_codes.some((code) => MANDATORY_DENY_FAILURE_CODES.has(code))) {
    return { action: "deny", failure_codes };
  }

  if (
    result.currently_acceptable === "indeterminate"
    || !result.cryptographically_authentic
    || !result.status_evidence_authentic
    || failure_codes.some((code) => MANDATORY_INDETERMINATE_FAILURE_CODES.has(code))
  ) {
    return { action: "indeterminate", failure_codes };
  }

  if (result.currently_acceptable === "yes") {
    return { action: "permit", failure_codes };
  }

  return { action: "deny", failure_codes };
}
