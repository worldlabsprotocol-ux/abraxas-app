// FILE: lib/partner/valueEvidence/unitEconomics.ts
// Unit economics readiness — structure without invented values.

import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { UnitEconomicsReadiness, ProvenanceQuality } from "./contract";

export function buildUnitEconomicsReadiness(sandbox: PartnerPilotSummary, production: PartnerPilotSummary | null): UnitEconomicsReadiness {
  const prod = production ?? sandbox;
  const verifications = prod.metrics.successful_receipt_verifications.value;
  const reuseRate = prod.metrics.reuse_rate.value;

  const measurable: Record<string, number | null> = {
    verification_request_volume: prod.metrics.total_requests.value,
    successful_verifications: verifications,
    evidence_reuse_count: prod.metrics.evidence_reuse_count.value,
    refresh_required_count: prod.metrics.evidence_refresh_required_count.value,
  };

  const missing: string[] = [
    "revenue_per_verification",
    "direct_cost_per_verification",
    "external_provider_call_cost",
    "infrastructure_cost_allocation",
    "manual_review_labor_cost",
  ];

  let reusableRate: ProvenanceQuality = "unavailable";
  if (reuseRate != null) reusableRate = "derived";

  return {
    revenue_per_verification: "unavailable",
    direct_cost_per_verification: "unavailable",
    gross_margin: "unavailable",
    manual_review_rate: "unavailable",
    reusable_verification_rate: reusableRate,
    missing_inputs: missing,
    measurable_inputs: measurable,
  };
}

export const REVENUE_BOUNDARY = {
  arr: "unavailable" as const,
  acv: "unavailable" as const,
  revenue: "unavailable" as const,
  note: "Connect to verified commercial/financial source in future — never infer from technical usage",
};
