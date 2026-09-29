// FILE: lib/partner/valueEvidence/contract.ts
// Business proof contracts — technical vs commercial separation. No fabricated revenue.

export const VALUE_EVIDENCE_VERSION = "1.0.0" as const;

export type ProvenanceQuality = "measured" | "derived" | "unavailable" | "operator_asserted";

export type AbraxasValueDimension =
  | "integration_velocity"
  | "production_conversion"
  | "verification_usage"
  | "evidence_reuse"
  | "policy_expansion"
  | "partner_retention"
  | "holder_reuse"
  | "unit_economics"
  | "customer_value";

export interface ValueDimensionReport {
  status: "measured" | "partially_measured" | "unavailable";
  evidence: Record<string, unknown>;
  limitations: string[];
}

export const TECHNICAL_LIFECYCLE_STAGES = [
  "prospect",
  "design_partner",
  "sandbox_started",
  "integration_verified",
  "pilot_ready",
  "pilot_live",
  "pilot_evidence_available",
  "production_requested",
  "production_approved",
  "production_active",
] as const;
export type TechnicalLifecycleStage = (typeof TECHNICAL_LIFECYCLE_STAGES)[number];

export const COMMERCIAL_LIFECYCLE_STAGES = [
  "none",
  "commercial_review",
  "converted",
  "declined",
  "not_converted",
  "paused",
] as const;
export type CommercialLifecycleStage = (typeof COMMERCIAL_LIFECYCLE_STAGES)[number];

export const UNIFIED_LIFECYCLE_STAGES = [
  "prospect",
  "design_partner",
  "sandbox_started",
  "integration_verified",
  "pilot_ready",
  "pilot_live",
  "pilot_evidence_available",
  "production_requested",
  "production_approved",
  "production_active",
  "commercial_review",
  "converted",
  "paused",
  "declined",
  "not_converted",
] as const;
export type UnifiedLifecycleStage = (typeof UNIFIED_LIFECYCLE_STAGES)[number];

export interface PartnerLifecycleResolution {
  lifecycle_stage: UnifiedLifecycleStage;
  technical_stage: TechnicalLifecycleStage;
  commercial_stage: CommercialLifecycleStage;
  stage_entered_at: string | null;
  blockers: string[];
  supporting_evidence: string[];
}

export interface DurationMetric {
  duration_ms: number | null;
  quality: "measured" | "unavailable";
  start_event: string;
  end_event: string;
}

export interface SampleSizedRate {
  numerator: number;
  denominator: number;
  rate: number | null;
  sample_size_warning: boolean;
}

export interface PolicyExpansionEvidence {
  first_policy_used: string | null;
  active_policy_count: number;
  policies_used: string[];
  first_policy_at: string | null;
  additional_policy_first_used_at: string | null;
  policy_expansion_observed: boolean;
  environment: "sandbox" | "production";
}

export interface UnitEconomicsReadiness {
  revenue_per_verification: ProvenanceQuality;
  direct_cost_per_verification: ProvenanceQuality;
  gross_margin: ProvenanceQuality;
  manual_review_rate: ProvenanceQuality;
  reusable_verification_rate: ProvenanceQuality;
  missing_inputs: string[];
  measurable_inputs: Record<string, number | null>;
}

export interface CaseStudyReadiness {
  integration_velocity: "ready" | "missing";
  production_usage: "ready" | "missing";
  verification_success: "ready" | "missing";
  evidence_reuse: "ready" | "missing";
  privacy_minimization: "ready" | "missing";
  policy_expansion: "ready" | "missing";
  customer_quote: "operator_required";
  customer_roi: "measured" | "unavailable";
  commercial_status: "operator_required" | "recorded" | "missing";
  measured_evidence: string[];
  missing_evidence: string[];
  safe_claims_today: string[];
  partner_questions: string[];
}

export interface InvestorClaim {
  claim_id: string;
  claim: string;
  status: "supported" | "not_supported";
  evidence_source: string;
  quality: ProvenanceQuality;
  time_window: { from: string | null; to: string | null };
  scope: string;
  generated_at: string;
  data_through: string | null;
  numerator: number | null;
  denominator: number | null;
}

export interface FundraisingEvidenceRow {
  category: string;
  status: "supported" | "partial" | "unavailable" | "operator_input_required";
  evidence: string[];
  missing: string[];
}

export const VALUE_EVIDENCE_NOTICE =
  "Value evidence separates technical system truth from operator-recorded commercial truth. No revenue, ARR, ACV, ROI, or customer quotes are inferred from usage.";

/** Capital discipline: prefer platform-compounding work over one-off customer requests. */
export const CAPITAL_DISCIPLINE_PRINCIPLE =
  "Capital should buy Abraxas the ability to stay disciplined, not the ability to build every requested feature.";
