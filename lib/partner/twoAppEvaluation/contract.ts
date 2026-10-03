// FILE: lib/partner/twoAppEvaluation/contract.ts
// External two-app reuse evaluation — canonical contract. No holder PII.

export const TWO_APP_EVALUATION_VERSION = "1.0.0" as const;

export const TWO_APP_EVALUATION_PUBLIC_CODE = "two_app_evaluation" as const;

/** Canonical evaluation lifecycle stages — derived from observable events only. */
export const TWO_APP_EVALUATION_STAGES = [
  "invited",
  "discovery_complete",
  "sandbox_ready",
  "app_a_configured",
  "app_a_result_verified",
  "app_b_configured",
  "reuse_attempted",
  "app_b_result_verified",
  "reuse_confirmed",
  "evidence_ready",
  "evaluation_complete",
  "blocked",
  "abandoned",
] as const;

export type TwoAppEvaluationStage = (typeof TWO_APP_EVALUATION_STAGES)[number];

export const TWO_APP_EVIDENCE_CLASSIFICATIONS = [
  "REFERENCE_TEST",
  "INTERNAL_SANDBOX",
  "UNCLASSIFIED_SANDBOX",
  "EXTERNAL_SANDBOX",
  "PRODUCTION",
] as const;

export type TwoAppEvidenceClassification = (typeof TWO_APP_EVIDENCE_CLASSIFICATIONS)[number];

export const TWO_APP_EVALUATION_BLOCKER_CATEGORIES = [
  "unclear_value",
  "setup_confusion",
  "authentication",
  "callback_configuration",
  "policy_selection",
  "holder_flow",
  "server_verification",
  "reuse_not_compatible",
  "documentation",
  "security_review",
  "internal_priority",
  "other",
] as const;

export type TwoAppEvaluationBlockerCategory = (typeof TWO_APP_EVALUATION_BLOCKER_CATEGORIES)[number];

export const TWO_APP_DEFAULT_POLICY_PACK = "identity_liveness" as const;

export interface TwoAppEvaluationRecord {
  evaluation_id: string;
  partner_id: string;
  environment: "sandbox";
  started_at: string;
  target_policy_pack: string;
  app_a: { application_id: string; display_name: string };
  app_b: { application_id: string; display_name: string };
  evidence_classification: TwoAppEvidenceClassification;
  operator_classification_override: TwoAppEvidenceClassification | null;
  classification_source:
    | "unclassified"
    | "inferred_reference"
    | "inferred_internal"
    | "design_partner_promotion"
    | "operator_review"
    | null;
  classified_at: string | null;
  classification_operator_ref: string | null;
  discovery_completed_at: string | null;
  blocked_category: TwoAppEvaluationBlockerCategory | null;
  blocked_note: string | null;
}

export type ChecklistItemStatus = "pending" | "observed" | "failed" | "unavailable";

export interface EvaluationChecklistItem {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  observed_at: string | null;
  source: string;
  failure_reason: string | null;
}

export interface AppEvaluationChecklist {
  application_id: string;
  display_name: string;
  items: EvaluationChecklistItem[];
  server_verification_passed: boolean;
  result_verified_at: string | null;
}

export interface ReuseObservation {
  status: "not_yet_observed" | "accepted" | "rejected" | "refresh_required";
  observed_at: string | null;
  source: string | null;
  safe_reason: string | null;
}

export interface TwoAppReuseMetrics {
  underlying_verification_events: number | null;
  applications_with_verified_results: number;
  additional_raw_kyc_recollections: number | null;
  reuse_status: ReuseObservation["status"];
  server_verification_app_a: boolean;
  server_verification_app_b: boolean;
  metrics_quality: "observed" | "partial" | "not_yet_observed";
}

export interface TwoAppTimeToValue {
  evaluation_start_to_sandbox_ready_ms: number | null;
  evaluation_start_to_first_verified_result_ms: number | null;
  app_a_success_to_app_b_configured_ms: number | null;
  app_a_success_to_reuse_success_ms: number | null;
  evaluation_start_to_reuse_success_ms: number | null;
  notice: string;
}

export interface TwoAppPayloadComparison {
  source_evidence_may_include: readonly string[];
  application_receives: readonly string[];
  observed_field_inventory: readonly string[];
  quality: "conceptual" | "observed" | "not_yet_observed";
}

export type TwoAppTechnicalEvaluationStatus = "NOT_YET_OBSERVED" | "PARTIAL" | "COMPLETE";
export type TwoAppExternalProofEligibility = "ESTABLISHED" | "NOT_ESTABLISHED";

export interface TwoAppEvaluationEvidencePacket {
  contract_version: typeof TWO_APP_EVALUATION_VERSION;
  evaluation_id: string;
  partner_ref: string;
  app_a_ref: string;
  app_b_ref: string;
  environment: "sandbox";
  evidence_classification: TwoAppEvidenceClassification;
  classification_source: TwoAppEvaluationRecord["classification_source"];
  classified_at: string | null;
  technical_evaluation_status: TwoAppTechnicalEvaluationStatus;
  external_proof_eligibility: TwoAppExternalProofEligibility;
  evidence_status: TwoAppTechnicalEvaluationStatus;
  started_at: string;
  completed_at: string | null;
  stage_timeline: Array<{ stage: TwoAppEvaluationStage; at: string | null; source: string }>;
  app_a_result_status: ChecklistItemStatus;
  app_b_result_status: ChecklistItemStatus;
  reuse_observed: boolean;
  reuse_metrics: TwoAppReuseMetrics;
  time_to_value: TwoAppTimeToValue;
  payload_comparison: TwoAppPayloadComparison;
  integration_blockers: TwoAppEvaluationBlockerCategory[];
  success_criteria: TwoAppSuccessCriteriaResult;
  limitations: readonly string[];
  notice: string;
}

export interface TwoAppSuccessCriteriaResult {
  external_partner_context: boolean;
  technical_success_met: boolean;
  two_distinct_applications: boolean;
  app_a_server_verified: boolean;
  app_b_server_verified: boolean;
  reuse_accepted_observed: boolean;
  no_second_provider_verification_for_reuse: boolean | null;
  public_partner_interfaces_used: boolean;
  privacy_checks_pass: boolean;
  evidence_exportable: boolean;
  all_met: boolean;
}

export interface TwoAppEvaluationView {
  record: TwoAppEvaluationRecord;
  stage: TwoAppEvaluationStage;
  stage_source: string;
  app_a: AppEvaluationChecklist;
  app_b: AppEvaluationChecklist;
  reuse: ReuseObservation;
  reuse_metrics: TwoAppReuseMetrics;
  time_to_value: TwoAppTimeToValue;
  payload_comparison: TwoAppPayloadComparison;
  success_criteria: TwoAppSuccessCriteriaResult;
  partner_summary: TwoAppPartnerSummary | null;
  blockers: TwoAppEvaluationBlockerCategory[];
  evidence_packet_ready: boolean;
  technical_evaluation_status: TwoAppTechnicalEvaluationStatus;
  external_proof_eligibility: TwoAppExternalProofEligibility;
  commercial_success_event: "EXTERNAL_TWO_APP_REUSE_COMPLETED" | "NOT_YET_OBSERVED";
}

export interface TwoAppPartnerSummary {
  headline: string;
  bullets: string[];
  time_to_first_result: string | null;
  time_to_reuse: string | null;
  evidence_status: string;
}

export const TWO_APP_EVALUATION_NOTICE =
  "Two-app evaluation evidence is derived from privacy-safe integration lifecycle events. Technical success does not establish external customer proof until classification is positively established by operator review or approved design-partner promotion.";

export const EXTERNAL_TWO_APP_REUSE_EVENT = "EXTERNAL_TWO_APP_REUSE_COMPLETED" as const;
