// FILE: lib/progressiveProof/evaluateFromSubject.ts
// Bridge policy evaluation results into the progressive proof UI model.

import type { PolicyEvaluationResult, PartnerPolicyRules } from "@/lib/policy/types";
import { evaluateProgressiveProof } from "@/lib/progressiveProof/evaluate";
import { mapCredentialClaimToHeld } from "@/lib/progressiveProof/mapHeldClaims";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { ProgressiveProofEvaluation } from "@/lib/progressiveProof/types";

export function evaluateProgressiveProofFromPolicy(input: {
  signedIn: boolean;
  walletBound: boolean;
  consentGranted?: boolean;
  policyRules: PartnerPolicyRules;
  policyEvaluation?: PolicyEvaluationResult;
  heldClaims?: CredentialClaimRecord[];
}): ProgressiveProofEvaluation {
  const held = (input.heldClaims ?? []).map(mapCredentialClaimToHeld);

  return evaluateProgressiveProof({
    signedIn: input.signedIn,
    walletBound: input.walletBound,
    consentGranted: input.consentGranted,
    policyRules: input.policyRules,
    policyDecision: input.policyEvaluation?.decision,
    missingClaims: input.policyEvaluation?.missing_claims,
    reasonCodes: input.policyEvaluation?.reason_codes,
    heldClaims: held,
  });
}
