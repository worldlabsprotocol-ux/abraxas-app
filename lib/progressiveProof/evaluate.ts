// FILE: lib/progressiveProof/evaluate.ts
// Progressive proof evaluation — never treat missing proof as eligible.

import { resolveStoredRequiredClaims } from "@/lib/policy/evaluatePolicy";
import type { PartnerPolicyRules, PolicyDecision } from "@/lib/policy/types";
import { resolveNextEvidenceStep } from "@/lib/progressiveProof/evidenceRouting";
import type {
  HeldClaimRecord,
  ProgressiveProofEvaluation,
  ProgressiveProofEvaluationInput,
  ProgressiveProofUiState,
} from "@/lib/progressiveProof/types";

function activeClaimTypes(held: HeldClaimRecord[]): string[] {
  return held.filter((c) => c.status === "active").map((c) => c.claimType);
}

export function evaluateProgressiveProof(
  input: ProgressiveProofEvaluationInput,
): ProgressiveProofEvaluation {
  const held = input.heldClaims ?? [];
  const required = resolveStoredRequiredClaims(input.policyRules);
  const requiredTypes = required.map((r) => r.claim_type);
  const satisfied = activeClaimTypes(held).filter((t) => requiredTypes.includes(t));
  const computedMissing = requiredTypes.filter((t) => !satisfied.includes(t));

  let missing: string[];
  if (input.heldClaims != null) {
    // Held snapshot present — never trust caller-supplied missingClaims: [] alone.
    missing = input.missingClaims != null
      ? [...new Set([...computedMissing, ...input.missingClaims])]
      : computedMissing;
  } else if (input.missingClaims != null) {
    missing = [...input.missingClaims];
    // Fail closed: empty missing_claims cannot override absent held-claim evidence.
    if (missing.length === 0 && computedMissing.length > 0) {
      missing = computedMissing;
    }
  } else {
    missing = computedMissing;
  }

  const hasExpired = held.some((c) => c.status === "expired" && requiredTypes.includes(c.claimType));
  const hasRevoked = held.some((c) => c.status === "revoked" && requiredTypes.includes(c.claimType));
  const hasPending = held.some((c) => c.status === "under_review" && requiredTypes.includes(c.claimType));

  const policyApproved = input.policyDecision === "approved" && missing.length === 0;
  const heldSnapshotBlocksApproval = input.heldClaims != null && computedMissing.length > 0;

  let uiState: ProgressiveProofUiState;
  let detail: string;

  if (!input.signedIn) {
    uiState = "proof_needed";
    detail = "account_required";
  } else if (hasRevoked) {
    uiState = "denied";
    detail = "claim_revoked";
  } else if (hasExpired) {
    uiState = "expired";
    detail = "claim_expired";
  } else if (hasPending || input.policyDecision === "manual_review") {
    uiState = "pending";
    detail = "manual_review";
  } else if (missing.length > 0) {
    uiState = "proof_needed";
    detail = `missing:${missing.join(",")}`;
  } else if (policyApproved && !heldSnapshotBlocksApproval) {
    uiState = "eligible";
    detail = "policy_satisfied";
  } else if (input.policyDecision === "denied") {
    uiState = "denied";
    detail = input.reasonCodes?.[0] ?? "policy_denied";
  } else {
    uiState = "proof_needed";
    detail = "evidence_required";
  }

  // Fail closed: never eligible when claims are still missing.
  if (missing.length > 0 && uiState === "eligible") {
    uiState = "proof_needed";
    detail = "missing_proof_fail_closed";
  }

  const nextEvidenceStep = uiState === "eligible" || uiState === "denied" || uiState === "pending"
    ? null
    : resolveNextEvidenceStep({
      signedIn: input.signedIn,
      walletBound: input.walletBound,
      consentGranted: input.consentGranted ?? false,
      policyRules: input.policyRules,
      missingClaimTypes: missing,
    });

  return {
    uiState,
    nextEvidenceStep,
    missingClaimTypes: missing,
    satisfiedClaimTypes: satisfied,
    detail,
    signInIsNotProof: true,
  };
}

export function mapPolicyDecisionToUiState(decision: PolicyDecision | undefined): ProgressiveProofUiState {
  if (!decision) return "proof_needed";
  if (decision === "approved") return "eligible";
  if (decision === "manual_review") return "pending";
  return "denied";
}
