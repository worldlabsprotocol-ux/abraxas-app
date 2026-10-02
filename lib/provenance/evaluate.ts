// FILE: lib/provenance/evaluate.ts
// Evaluate provenance policy questions against artifact-bound claims.

import { assertClaimDoesNotOverstate } from "./claimSemantics";
import { artifactFingerprintsMatch } from "./artifactFingerprint";
import type { ProvenanceEvaluationInput, ProvenanceEvaluationResult } from "./types";
import { resolveProvenancePolicyPack } from "./policyPacks";

function findActiveClaim(
  claims: ProvenanceEvaluationInput["claims"],
  claimType: string,
) {
  return claims.find((c) => c.claim_type === claimType && c.status === "active");
}

export function evaluateProvenancePolicy(input: ProvenanceEvaluationInput): ProvenanceEvaluationResult {
  const pack = resolveProvenancePolicyPack(input.policyPackId);
  if (!pack) {
    return {
      approved: false,
      disclosed_result: null,
      reason_codes: ["unknown_provenance_policy"],
      evaluated_claim_types: [],
    };
  }

  const requiredClaim = findActiveClaim(input.claims, pack.required_claim);
  if (!requiredClaim) {
    return {
      approved: false,
      disclosed_result: null,
      reason_codes: ["missing_required_provenance_claim"],
      evaluated_claim_types: [],
    };
  }

  const overstated = assertClaimDoesNotOverstate(pack.required_claim, pack.disclosed_result);
  if (!overstated.ok) {
    return {
      approved: false,
      disclosed_result: null,
      reason_codes: [overstated.reason],
      evaluated_claim_types: [requiredClaim.claim_type],
    };
  }

  if (pack.required_claim === "source_integrity_verified") {
    const bindingHash = input.artifactBinding?.content_hash
      ?? (typeof requiredClaim.claim_value.content_hash === "string"
        ? requiredClaim.claim_value.content_hash
        : null);

    if (!bindingHash || !input.submittedContentHash) {
      return {
        approved: false,
        disclosed_result: null,
        reason_codes: ["artifact_hash_required"],
        evaluated_claim_types: [requiredClaim.claim_type],
      };
    }

    if (!artifactFingerprintsMatch(
      { content_hash: bindingHash },
      { content_hash: input.submittedContentHash },
    )) {
      return {
        approved: false,
        disclosed_result: null,
        reason_codes: ["source_integrity_mismatch"],
        evaluated_claim_types: [requiredClaim.claim_type],
      };
    }

  }

  if (pack.required_claim === "ai_assistance_disclosed") {
    const category = requiredClaim.claim_value.category;
    if (typeof category !== "string" || !category) {
      return {
        approved: false,
        disclosed_result: null,
        reason_codes: ["ai_disclosure_missing"],
        evaluated_claim_types: [requiredClaim.claim_type],
      };
    }
  }

  return {
    approved: true,
    disclosed_result: pack.disclosed_result,
    reason_codes: [],
    evaluated_claim_types: [requiredClaim.claim_type],
  };
}
