// FILE: lib/partner/twoAppEvaluation/evidencePacket.ts
// Privacy-safe evaluation evidence export.

import type {
  TwoAppEvaluationEvidencePacket,
  TwoAppEvaluationRecord,
  TwoAppEvaluationStage,
  TwoAppEvaluationView,
} from "./contract";
import { TWO_APP_EVALUATION_NOTICE, TWO_APP_EVALUATION_VERSION } from "./contract";
import { canClaimExternalReuseProof } from "./claimGate";

function pseudonymRef(prefix: string, id: string): string {
  return `${prefix}_${id.slice(0, 8)}`;
}

export function buildTwoAppEvidencePacket(view: TwoAppEvaluationView): TwoAppEvaluationEvidencePacket {
  const { record, stage, success_criteria, reuse_metrics, time_to_value, payload_comparison, blockers } = view;
  const reuseObserved = view.reuse.status === "accepted";

  const evidenceStatus = success_criteria.all_met
    ? "COMPLETE"
    : reuseObserved || view.app_a.server_verification_passed
      ? "PARTIAL"
      : "NOT_YET_OBSERVED";

  const claimGate = canClaimExternalReuseProof({
    evidence_classification: record.evidence_classification,
    success_criteria,
    reuse_observed: reuseObserved,
    evidence_internally_consistent: record.app_a.application_id !== record.app_b.application_id,
  });

  return {
    contract_version: TWO_APP_EVALUATION_VERSION,
    evaluation_id: record.evaluation_id,
    partner_ref: pseudonymRef("partner", record.partner_id),
    app_a_ref: pseudonymRef("app", record.app_a.application_id),
    app_b_ref: pseudonymRef("app", record.app_b.application_id),
    environment: "sandbox",
    evidence_classification: record.evidence_classification,
    evidence_status: evidenceStatus,
    started_at: record.started_at,
    completed_at: success_criteria.all_met ? view.reuse.observed_at : null,
    stage_timeline: [{ stage, at: view.reuse.observed_at ?? record.started_at, source: view.stage_source }],
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
      claimGate.allowed
        ? "External reuse claim gate passed for internal diligence."
        : `External reuse claim gate not satisfied: ${claimGate.reasons.join(", ")}`,
    ],
    notice: TWO_APP_EVALUATION_NOTICE,
  };
}
