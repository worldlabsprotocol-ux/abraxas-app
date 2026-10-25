/**
 * Minimal permit / deny / indeterminate mapping for portable verification (copy-friendly).
 */
import type { IndependentVerificationResult } from "../../packages/abraxas-independent-verifier/src/index";

export type EnforcementAction = "permit" | "deny" | "indeterminate";

export function enforcementFromVerification(result: IndependentVerificationResult): {
  action: EnforcementAction;
  failure_codes: string[];
} {
  if (
    result.currently_acceptable === "indeterminate"
    || !result.cryptographically_authentic
    || !result.status_evidence_authentic
    || result.failure_codes.includes("bundled_trust_anchor_not_authenticated")
    || result.failure_codes.includes("anchor_fingerprint_mismatch")
  ) {
    return { action: "indeterminate", failure_codes: result.failure_codes };
  }
  if (result.currently_acceptable === "yes") {
    return { action: "permit", failure_codes: result.failure_codes };
  }
  return { action: "deny", failure_codes: result.failure_codes };
}
