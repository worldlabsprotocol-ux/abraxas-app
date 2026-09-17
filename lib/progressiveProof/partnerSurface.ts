// FILE: lib/progressiveProof/partnerSurface.ts
// Partner-facing verification surface — chain-agnostic documented result.

import type { PolicyEvaluationResult } from "@/lib/policy/types";
import type { PartnerVerificationSurface, ProgressiveProofEvaluation } from "@/lib/progressiveProof/types";

const WITHHELD_FROM_PARTNERS = [
  "date_of_birth",
  "street_address",
  "passport_image",
  "government_id_number",
  "raw_document",
] as const;

export function buildPartnerVerificationSurface(input: {
  evaluation: ProgressiveProofEvaluation;
  policyEvaluation?: PolicyEvaluationResult;
}): PartnerVerificationSurface {
  const decision = input.policyEvaluation?.decision
    ?? (input.evaluation.uiState === "eligible" ? "approved"
      : input.evaluation.uiState === "pending" ? "manual_review"
        : input.evaluation.uiState === "denied" ? "denied"
          : "pending");

  const disclosed = input.evaluation.satisfiedClaimTypes.filter(
    (c) => !WITHHELD_FROM_PARTNERS.includes(c as typeof WITHHELD_FROM_PARTNERS[number]),
  );

  return {
    decision: input.evaluation.uiState === "error" ? "error" : decision,
    uiState: input.evaluation.uiState,
    assuranceLevel: inferAssuranceFromClaims(input.evaluation.satisfiedClaimTypes),
    receiptRequired: input.evaluation.uiState === "eligible",
    productionUsable: input.policyEvaluation?.production_usable ?? false,
    disclosedClaims: disclosed,
    withheld: WITHHELD_FROM_PARTNERS,
  };
}

function inferAssuranceFromClaims(satisfied: string[]): "L0" | "L1" | "L2" | "L3" | "L4" | null {
  if (satisfied.includes("government_id_verified") || satisfied.includes("identity_verified")) return "L3";
  if (satisfied.includes("liveness_passed")) return "L2";
  if (satisfied.includes("self_attested_age_band")) return "L1";
  if (satisfied.includes("wallet_binding_confirmed")) return "L2";
  return satisfied.length > 0 ? "L1" : null;
}
