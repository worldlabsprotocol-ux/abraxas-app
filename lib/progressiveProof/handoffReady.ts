// FILE: lib/progressiveProof/handoffReady.ts
// Policy-aware partner handoff readiness — browse policies do not require full IDV credential.

import type { PartnerPolicyRules } from "@/lib/policy/types";
import { isBrowseAccessPolicy } from "@/lib/policy/selfAttestationGuards";
import { evaluateProgressiveProof } from "@/lib/progressiveProof/evaluate";

export interface PartnerHandoffReadinessInput {
  signedIn: boolean;
  walletBound: boolean;
  identityCredentialEarned: boolean;
  hasCredential: boolean;
  policyRules?: PartnerPolicyRules | null;
  policyDecision?: "approved" | "denied" | "manual_review";
  missingClaims?: string[];
}

/**
 * Returns true when the holder may complete partner-flow handoff for the given policy.
 * Legacy path (no policyRules): requires full identity credential — preserved for callers
 * that have not migrated yet.
 */
export function isProgressivePartnerHandoffReady(input: PartnerHandoffReadinessInput): boolean {
  if (!input.signedIn) return false;

  if (!input.policyRules) {
    return input.identityCredentialEarned && input.hasCredential;
  }

  if (isBrowseAccessPolicy(input.policyRules)) {
    const evalResult = evaluateProgressiveProof({
      signedIn: input.signedIn,
      walletBound: input.walletBound,
      policyRules: input.policyRules,
      policyDecision: input.policyDecision,
      missingClaims: input.missingClaims,
    });
    return evalResult.uiState === "eligible";
  }

  const evalResult = evaluateProgressiveProof({
    signedIn: input.signedIn,
    walletBound: input.walletBound,
    policyRules: input.policyRules,
    policyDecision: input.policyDecision,
    missingClaims: input.missingClaims,
  });

  return evalResult.uiState === "eligible";
}
