// FILE: lib/partner/portableIndependentVerification/plainVerificationSummary.ts

import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

export type PlainVerificationVerdict =
  | "Valid"
  | "Not valid"
  | "Wrong audience"
  | "Revoked"
  | "Needs fresh status";

export function plainVerificationVerdict(
  verification: IndependentVerificationResult,
  scenario?: string,
): PlainVerificationVerdict {
  if (scenario === "wrong_audience") return "Wrong audience";
  if (scenario === "revoked") return "Revoked";
  const stale = verification.failure_codes.some((c) =>
    c.includes("stale") || c.includes("freshness") || c.includes("expired"),
  );
  if (stale) return "Needs fresh status";
  if (verification.currently_acceptable === "yes") return "Valid";
  const revoked = verification.failure_codes.some((c) => c.includes("revok")) ||
    verification.phases.some((p) => p.detail.toLowerCase().includes("revok"));
  if (revoked) return "Revoked";
  const audience = verification.failure_codes.some((c) =>
    c.includes("audience") || c.includes("partner") || c.includes("policy"),
  );
  if (audience) return "Wrong audience";
  return "Not valid";
}

export function plainWhatItProves(input: {
  policyId: string;
  partnerId: string;
  decision?: string;
}): string {
  return `This receipt says the check "${input.policyId}" passed for "${input.partnerId}" at the time it was signed.`;
}

export function plainIssuerLine(verification: IndependentVerificationResult): string {
  return verification.issuer_currently_authorized
    ? "The signing key was authorized when we checked."
    : "The signing key is not currently authorized for your trust setup.";
}

export function plainAcceptabilityLine(verification: IndependentVerificationResult): string {
  if (verification.currently_acceptable === "yes") {
    return "You could allow the protected action for this partner and policy, if your policy still accepts this status snapshot.";
  }
  if (verification.currently_acceptable === "no") {
    return "Do not allow the action — something failed policy, status, or freshness checks.";
  }
  return "We could not decide acceptability from this evidence alone.";
}