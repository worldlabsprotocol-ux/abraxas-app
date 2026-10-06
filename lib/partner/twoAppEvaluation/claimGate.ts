// FILE: lib/partner/twoAppEvaluation/claimGate.ts
// Internal diligence gate — does not publish customer names or claims.

import type { TwoAppEvaluationEvidencePacket } from "./contract";
import type { TwoAppSuccessCriteriaResult } from "./contract";
import { isPositiveExternalClassification } from "./classification";

export interface ExternalReuseClaimGateResult {
  allowed: boolean;
  reasons: string[];
}

export function canClaimExternalReuseProof(input: {
  evidence_classification: TwoAppEvaluationEvidencePacket["evidence_classification"];
  success_criteria: TwoAppSuccessCriteriaResult;
  reuse_observed: boolean;
  evidence_internally_consistent: boolean;
}): ExternalReuseClaimGateResult {
  const reasons: string[] = [];

  if (input.evidence_classification === "UNCLASSIFIED_SANDBOX") {
    reasons.push("classification_unclassified");
  } else if (!isPositiveExternalClassification(input.evidence_classification)) {
    reasons.push("classification_not_external");
  }
  if (!input.success_criteria.two_distinct_applications) {
    reasons.push("two_distinct_applications_required");
  }
  if (!input.success_criteria.app_a_server_verified) {
    reasons.push("app_a_server_verification_required");
  }
  if (!input.success_criteria.app_b_server_verified) {
    reasons.push("app_b_server_verification_required");
  }
  if (!input.reuse_observed || !input.success_criteria.reuse_accepted_observed) {
    reasons.push("reuse_accepted_event_required");
  }
  if (!input.success_criteria.privacy_checks_pass) {
    reasons.push("privacy_checks_required");
  }
  if (!input.evidence_internally_consistent) {
    reasons.push("evidence_packet_inconsistent");
  }

  return { allowed: reasons.length === 0, reasons };
}
