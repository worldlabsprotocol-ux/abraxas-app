// FILE: lib/partner/pilotEvidence/metricDefinitions.ts
// Internal metric-definition registry. Do not silently change definitions.

import type { MetricDefinition } from "./contract";

export const PARTNER_VALUE_METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  {
    id: "total_requests",
    label: "Total requests",
    definition: "Distinct verification requests (request_id, correlation_id, or handoff_ref) with a request-created or handoff-created event.",
    source: "partner_integration_events",
    numerator: "count(distinct request keys)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "completed_holder_flows",
    label: "Completed holder flows",
    definition: "Distinct request keys with holder_flow_completed.",
    source: "partner_integration_events",
    numerator: "count(distinct request keys where holder_flow_completed)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "receipts_issued",
    label: "Receipt issuance events",
    definition: "All receipt_issued integration events (includes idempotent replays).",
    source: "partner_integration_events",
    numerator: "count(receipt_issued events)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "unique_receipts_issued",
    label: "Unique receipts issued",
    definition: "Distinct receipt_id values on receipt_issued events.",
    source: "partner_integration_events",
    numerator: "count(distinct receipt_id on receipt_issued)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "verification_attempts",
    label: "Verification attempts",
    definition: "All receipt_verification_succeeded and receipt_verification_failed events from verifyForAction instrumentation.",
    source: "partner_integration_events",
    numerator: "count(verification events)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "successful_receipt_verifications",
    label: "Successful verifications",
    definition: "receipt_verification_succeeded events.",
    source: "partner_integration_events",
    numerator: "count(receipt_verification_succeeded)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "verification_success_rate",
    label: "Verification success rate",
    definition: "successful_receipt_verifications / verification_attempts.",
    source: "partner_integration_events",
    numerator: "successful_receipt_verifications",
    denominator: "verification_attempts",
    quality: "derived",
  },
  {
    id: "evidence_reuse_count",
    label: "Evidence reuse accepted",
    definition: "evidence_reuse_accepted integration events.",
    source: "partner_integration_events",
    numerator: "count(evidence_reuse_accepted)",
    denominator: null,
    quality: "measured",
  },
  {
    id: "reuse_rate",
    label: "Reuse rate",
    definition: "evidence_reuse_count / (evidence_reuse_count + evidence_refresh_required_count + new verification holder completions without reuse).",
    source: "partner_integration_events",
    numerator: "evidence_reuse_count",
    denominator: "reuse opportunities (reuse + refresh_required on completed flows)",
    quality: "derived",
  },
  {
    id: "repeat_request_count",
    label: "Repeat requests",
    definition: "Completed holder flows beyond the first distinct request key for the scoped application and environment.",
    source: "partner_integration_events",
    numerator: "max(0, completed_holder_flows - 1)",
    denominator: null,
    quality: "derived",
  },
  {
    id: "repeat_holder_usage",
    label: "Repeat holder usage",
    definition: "Same privacy-safe holder reference completing multiple flows. Unavailable — holder pseudonym is not stored in integration events.",
    source: "unavailable",
    numerator: "n/a",
    denominator: null,
    quality: "unavailable",
  },
  {
    id: "median_verification_latency_ms",
    label: "Median verification latency",
    definition: "Median latency_ms on verification events where present.",
    source: "partner_integration_events",
    numerator: "median(latency_ms)",
    denominator: null,
    quality: "derived",
  },
] as const;

export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return PARTNER_VALUE_METRIC_DEFINITIONS.find((row) => row.id === id);
}
