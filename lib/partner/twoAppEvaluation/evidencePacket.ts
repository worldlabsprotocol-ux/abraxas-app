// FILE: lib/partner/twoAppEvaluation/evidencePacket.ts
// Privacy-safe evaluation evidence export.

import type {
  TwoAppEvaluationEvidencePacket,
  TwoAppEvaluationRecord,
  TwoAppEvaluationView,
  TwoAppExternalProofEligibility,
  TwoAppTechnicalEvaluationStatus,
} from "./contract";
import { TWO_APP_EVALUATION_NOTICE, TWO_APP_EVALUATION_VERSION } from "./contract";
import { canClaimExternalReuseProof } from "./claimGate";
import { getEffectiveClassification } from "./classification";

function pseudonymRef(prefix: string, id: string): string {
  return `${prefix}_${id.slice(0, 8)}`;
}

function deriveTechnicalStatus(view: TwoAppEvaluationView): TwoAppTechnicalEvaluationStatus {
  if (view.success_criteria.technical_success_met) return "COMPLETE";
  const reuseObserved = view.reuse.status === "accepted";
  if (reuseObserved || view.app_a.server_verification_passed) return "PARTIAL";
  return "NOT_YET_OBSERVED";
}

export function buildTwoAppEvidencePacket(view: TwoAppEvaluationView): TwoAppEvaluationEvidencePacket {
  const { record, success_criteria, reuse_metrics, time_to_value, payload_comparison, blockers } = view;
  const reuseObserved = view.reuse.status === "accepted";
  const effectiveClassification = getEffectiveClassification(record);
  const technicalEvaluationStatus = deriveTechnicalStatus(view);

  const claimGate = canClaimExternalReuseProof({
    evidence_classification: effectiveClassification,
    success_criteria,
    reuse_observed: reuseObserved,
    evidence_internally_consistent: record.app_a.application_id !== record.app_b.application_id,
  });

  const externalProofEligibility: TwoAppExternalProofEligibility = claimGate.allowed
    ? "ESTABLISHED"
    : "NOT_ESTABLISHED";

  return {
    contract_version: TWO_APP_EVALUATION_VERSION,
    evaluation_id: record.evaluation_id,
    partner_ref: pseudonymRef("partner", record.partner_id),
    app_a_ref: pseudonymRef("app", record.app_a.application_id),
    app_b_ref: pseudonymRef("app", record.app_b.application_id),
    environment: "sandbox",
    evidence_classification: effectiveClassification,
    classification_source: record.classification_source,
    classified_at: record.classified_at,
    technical_evaluation_status: technicalEvaluationStatus,
    external_proof_eligibility: externalProofEligibility,
    evidence_status: technicalEvaluationStatus,
    started_at: record.started_at,
    completed_at: success_criteria.technical_success_met ? view.reuse.observed_at : null,
    stage_timeline: [{ stage: view.stage, at: view.reuse.observed_at ?? record.started_at, source: view.stage_source }],
    app_a_result_status: view.app_a.server_verification_passed ? "observed" : "pending",
    app_b_result_status: view.app_b.server_verification_passed ? "observed" : "pending",
    reuse_observed: reuseObserved,
    reuse_metrics,
    time_to_value,
    payload_comparison,
    integration_blockers: blockers,
    success_criteria,
    limitations: [
      "Sandbox evaluation only — not production deployment proof.",
      "Evidence does not include holder PII, raw KYC, secrets, or webhook credentials.",
      technicalEvaluationStatus === "COMPLETE" && externalProofEligibility === "NOT_ESTABLISHED"
        ? "Technical evaluation: COMPLETE. External proof eligibility: NOT ESTABLISHED until positive external classification."
        : claimGate.allowed
          ? "External reuse claim gate passed for internal diligence."
          : `External reuse claim gate not satisfied: ${claimGate.reasons.join(", ")}`,
    ],
    notice: TWO_APP_EVALUATION_NOTICE,
  };
}
