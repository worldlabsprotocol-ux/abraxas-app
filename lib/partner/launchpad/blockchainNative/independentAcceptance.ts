import { enforcementFromIndependentVerification } from "@abraxas/independent-verifier";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

export function independentVerificationFullyAccepts(result: IndependentVerificationResult): boolean {
  if (!result.cryptographically_authentic) return false;
  if (!result.issuer_currently_authorized) return false;
  if (!result.policy_and_audience_match) return false;
  if (!result.status_evidence_authentic) return false;
  if (result.currently_acceptable !== "yes") return false;
  const enforcement = enforcementFromIndependentVerification(result);
  return enforcement.action === "permit";
}