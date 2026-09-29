// FILE: lib/partner/pilotEvidence/contract.ts
// Canonical partner value & pilot evidence contracts. Privacy-safe only.

export const PILOT_EVIDENCE_VERSION = "1.0.0" as const;

export type EvidenceQuality = "measured" | "derived" | "unavailable";

export type PilotEnvironment = "sandbox" | "production";

export const PARTNER_FUNNEL_STAGE_IDS = [
  "integration_configured",
  "first_sandbox_request",
  "first_sandbox_receipt",
  "production_requested",
  "production_activated",
  "first_production_request",
  "holder_flow_started",
  "holder_flow_completed",
  "receipt_issued",
  "partner_verification_succeeded",
  "access_decision_recorded",
  "repeat_request",
  "evidence_reused",
] as const;

export type PartnerFunnelStageId = (typeof PARTNER_FUNNEL_STAGE_IDS)[number];

export interface PartnerFunnelStage {
  stage: PartnerFunnelStageId;
  label: string;
  status: "observed" | "pending" | "unavailable";
  first_at: string | null;
  source: string;
}

export interface MetricDefinition {
  id: string;
  label: string;
  definition: string;
  source: string;
  numerator: string;
  denominator: string | null;
  quality: EvidenceQuality;
}

export interface MetricValue<T = number | null> {
  value: T;
  quality: EvidenceQuality;
  definition_id: string;
}

export interface PartnerValueMetrics {
  total_requests: MetricValue<number>;
  completed_holder_flows: MetricValue<number>;
  receipts_issued: MetricValue<number>;
  unique_receipts_issued: MetricValue<number>;
  verification_attempts: MetricValue<number>;
  successful_receipt_verifications: MetricValue<number>;
  failed_receipt_verifications: MetricValue<number>;
  unique_receipts_verified: MetricValue<number>;
  permit_decisions: MetricValue<number>;
  deny_decisions: MetricValue<number>;
  evidence_reuse_count: MetricValue<number>;
  evidence_refresh_required_count: MetricValue<number>;
  evidence_reuse_rejected_count: MetricValue<number>;
  unique_policy_count: MetricValue<number>;
  repeat_request_count: MetricValue<number>;
  repeat_holder_usage: MetricValue<number | null>;
  verification_success_rate: MetricValue<number | null>;
  reuse_rate: MetricValue<number | null>;
  median_verification_latency_ms: MetricValue<number | null>;
}

export interface TimeToValueMetrics {
  application_created_to_first_sandbox_request_ms: MetricValue<number | null>;
  application_created_to_first_sandbox_receipt_ms: MetricValue<number | null>;
  application_created_to_production_request_ms: MetricValue<number | null>;
  production_activation_to_first_production_verification_ms: MetricValue<number | null>;
  first_holder_flow_to_first_verified_receipt_ms: MetricValue<number | null>;
}

export interface PolicyConsumptionRow {
  policy_id: string;
  policy_version: number | null;
  pack_id: string | null;
  result_family: string | null;
  request_count: number;
  receipt_count: number;
  verification_count: number;
  reuse_count: number;
}

export interface PolicyPrivacyFacts {
  pack_id: string;
  result_family: string;
  partner_receives: string[];
  partner_does_not_receive: string[];
  statement: string;
}

export interface PartnerPilotSummary {
  contract_version: typeof PILOT_EVIDENCE_VERSION;
  partner_id: string;
  application_id: string;
  environment: PilotEnvironment;
  time_window: { from: string | null; to: string | null };
  integration_status: "working" | "degraded" | "blocked" | "not_started";
  production_status: {
    activated: boolean;
    activated_at: string | null;
  };
  funnel: PartnerFunnelStage[];
  metrics: PartnerValueMetrics;
  time_to_value: TimeToValueMetrics;
  policy_consumption: PolicyConsumptionRow[];
  privacy_facts: PolicyPrivacyFacts[];
  reliability: {
    verification_attempts: number;
    verification_successes: number;
    verification_failures: number;
    safe_failure_categories: string[];
    webhook_status: "not_selected" | "configured" | "degraded" | "unknown";
    callback_status: "ready" | "missing" | "localhost_only";
    credential_status: "active" | "revoked" | "never_issued";
  };
  case_study: CaseStudyEvidence;
  deduplication_notice: string;
  notice: string;
}

export interface CaseStudyEvidence {
  partner: string;
  period: { from: string | null; to: string | null; environment: PilotEnvironment };
  integration: Record<string, MetricValue<string | boolean | null>>;
  usage: Record<string, MetricValue<number | null>>;
  verification: Record<string, MetricValue<number | null>>;
  reuse: Record<string, MetricValue<number | null>>;
  privacy: Record<string, MetricValue<string | boolean>>;
  policies: PolicyConsumptionRow[];
  reliability: Record<string, MetricValue<number | string | null>>;
  evidence_quality: Record<string, EvidenceQuality>;
}

export const PILOT_EVIDENCE_NOTICE =
  "Pilot evidence is derived from privacy-safe integration lifecycle events and Launchpad activity. It never includes holder PII, raw evidence, credentials, or callback URLs.";

export const DEDUPLICATION_NOTICE =
  "Requests dedupe by request_id/correlation_id/handoff_ref. Receipt issuance dedupes by receipt_id for unique counts. Verification attempts count every server-side verify; unique_receipts_verified dedupes by receipt_id. Harness events (metadata.harness=true) are excluded from live funnel milestones.";
