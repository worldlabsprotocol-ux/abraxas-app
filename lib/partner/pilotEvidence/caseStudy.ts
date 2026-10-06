// FILE: lib/partner/pilotEvidence/caseStudy.ts
// Structured case-study evidence with explicit quality classification.

import type {
  CaseStudyEvidence,
  EvidenceQuality,
  PartnerPilotSummary,
} from "./contract";

function metricEntry<T>(value: T, quality: EvidenceQuality): { value: T; quality: EvidenceQuality; definition_id: string } {
  return { value, quality, definition_id: "case_study" };
}

export function buildCaseStudyEvidence(summary: PartnerPilotSummary): CaseStudyEvidence {
  const m = summary.metrics;
  const t = summary.time_to_value;

  const evidenceQuality: Record<string, EvidenceQuality> = {
    total_requests: m.total_requests.quality,
    receipts_issued: m.receipts_issued.quality,
    unique_receipts_issued: m.unique_receipts_issued.quality,
    verification_success_rate: m.verification_success_rate.quality,
    reuse_rate: m.reuse_rate.quality,
    evidence_reuse_count: m.evidence_reuse_count.quality,
    repeat_request_count: m.repeat_request_count.quality,
    repeat_holder_usage: m.repeat_holder_usage.quality,
    application_created_to_first_sandbox_receipt_ms: t.application_created_to_first_sandbox_receipt_ms.quality,
    cost_savings: "unavailable",
    revenue_impact: "unavailable",
    conversion_uplift: "unavailable",
  };

  return {
    partner: summary.partner_id,
    period: {
      from: summary.time_window.from,
      to: summary.time_window.to,
      environment: summary.environment,
    },
    integration: {
      status: metricEntry(summary.integration_status, "measured"),
      production_activated: metricEntry(summary.production_status.activated, "measured"),
      production_activated_at: metricEntry(summary.production_status.activated_at, "measured"),
    },
    usage: {
      total_requests: m.total_requests,
      completed_holder_flows: m.completed_holder_flows,
      repeat_request_count: m.repeat_request_count,
    },
    verification: {
      verification_attempts: m.verification_attempts,
      successful_receipt_verifications: m.successful_receipt_verifications,
      failed_receipt_verifications: m.failed_receipt_verifications,
      verification_success_rate: m.verification_success_rate,
      unique_receipts_verified: m.unique_receipts_verified,
    },
    reuse: {
      evidence_reuse_count: m.evidence_reuse_count,
      evidence_refresh_required_count: m.evidence_refresh_required_count,
      reuse_rate: m.reuse_rate,
    },
    privacy: {
      underlying_identity_attributes_withheld: metricEntry(true, "measured"),
      policy_specific_results_only: metricEntry(true, "measured"),
    },
    policies: summary.policy_consumption,
    reliability: {
      verification_failures: metricEntry(m.failed_receipt_verifications.value, "measured"),
      safe_failure_categories: metricEntry(
        summary.reliability.safe_failure_categories.join(", ") || "none",
        "measured",
      ),
    },
    evidence_quality: evidenceQuality,
  };
}
