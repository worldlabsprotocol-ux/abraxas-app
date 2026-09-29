// FILE: lib/partner/designPartnerProgram/contract.ts
// Design Partner Program contracts — composes #497 value evidence.

export const DESIGN_PARTNER_PROGRAM_VERSION = "1.0.0" as const;

export const PROGRAM_STATUSES = [
  "candidate",
  "accepted",
  "integration",
  "pilot_ready",
  "pilot_live",
  "pilot_complete",
  "commercial_review",
  "converted",
  "paused",
  "declined",
  "not_converted",
] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const CRITERION_TYPES = [
  "integration_completed",
  "first_successful_verification",
  "minimum_successful_verifications",
  "verification_success_rate",
  "evidence_reuse_observed",
  "production_activation",
  "policy_supported",
  "privacy_requirement_satisfied",
  "custom_operator_confirmed",
] as const;
export type CriterionType = (typeof CRITERION_TYPES)[number];

export type EvidenceProvenance = "system_measured" | "operator_asserted" | "customer_reported" | "derived" | "unavailable";

export type CriterionStatus = "pending" | "met" | "not_met" | "unavailable";

export interface EvaluatedCriterion {
  criterion_type: CriterionType;
  target: Record<string, unknown>;
  measurement_source: string;
  status: CriterionStatus;
  measured_value: number | string | boolean | null;
  quality: EvidenceProvenance;
  evaluated_at: string | null;
}

export type TechnicalOutcome =
  | "criteria_met"
  | "criteria_partially_met"
  | "criteria_not_met"
  | "insufficient_evidence";

export type DecisionOutcome = "converted" | "not_converted" | "extended" | "paused" | "pending";

export const DECISION_REASON_CODES = [
  "technical_fit",
  "privacy_fit",
  "integration_complexity",
  "missing_policy",
  "pricing",
  "budget",
  "timing",
  "internal_priority",
  "procurement",
  "security_review",
  "compliance_review",
  "custom_feature_dependency",
  "unknown",
  "other",
] as const;
export type DecisionReasonCode = (typeof DECISION_REASON_CODES)[number];

export type PermissionStatus = "pending" | "approved" | "denied";

export interface DesignPartnerProgramRow {
  application_id: string;
  partner_id: string;
  program_status: ProgramStatus;
  entered_at: string;
  target_decision_date: string | null;
  primary_use_case: string | null;
  initial_policy_pack: string | null;
  pilot_environment: "sandbox" | "production";
  technical_owner_status: "unknown" | "assigned" | "engaged" | "blocked" | null;
  business_owner_status: "unknown" | "assigned" | "engaged" | "blocked" | null;
  pilot_started_at: string | null;
  pilot_completed_at: string | null;
  decision_status: DecisionOutcome;
  decision_reason_codes: string[];
  decision_operator_summary: string | null;
  decision_recorded_at: string | null;
  technical_outcome: TechnicalOutcome | null;
  updated_at: string;
}

export interface PilotScorecard {
  partner_id: string;
  application_id: string;
  program_status: ProgramStatus;
  effective_program_status: ProgramStatus;
  criteria: EvaluatedCriterion[];
  criteria_met: number;
  criteria_not_met: number;
  criteria_pending: number;
  criteria_unavailable: number;
  technical_outcome: TechnicalOutcome;
  commercial_outcome: DecisionOutcome;
  evidence_quality: EvidenceProvenance;
  blockers: string[];
  next_action: string;
}

export const DESIGN_PARTNER_NOTICE =
  "Design Partner Program separates technical pilot evidence from commercial decisions. No revenue, ARR, or ROI is inferred.";
