// FILE: lib/partner/designPartnerProgram/portfolioExport.ts
// Design-partner portfolio evidence for investor diligence.

import type { DesignPartnerFunnelCounts } from "./funnel";
import type { PilotScorecard } from "./contract";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import type { DurationMetric } from "@/lib/partner/valueEvidence/contract";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function buildDesignPartnerPortfolioEvidence(input: {
  funnelCounts: DesignPartnerFunnelCounts;
  scorecards: Array<PilotScorecard | null>;
  valueEvidence: ApplicationValueEvidence[];
  timeToConversion: Record<string, DurationMetric>[];
  caseStudyPublishability: Array<"ready" | "partial" | "blocked">;
}): {
  accepted: number;
  integrated: number;
  successful_verification: number;
  pilot_complete: number;
  production_active: number;
  converted: number;
  median_time_to_first_verification_ms: number | null;
  median_time_to_production_ms: number | null;
  median_time_to_commercial_decision_ms: number | null;
  policy_expansion_observed: number;
  repeat_production_activity_observed: number;
  reuse_observed: number;
  case_studies: { ready: number; partial: number; blocked: number };
  provenance: string;
} {
  const verifyTimes = input.timeToConversion
    .map((t) => t.accepted_to_first_successful_verification?.duration_ms)
    .filter((v): v is number => v != null);
  const prodTimes = input.timeToConversion
    .map((t) => t.accepted_to_production_active?.duration_ms)
    .filter((v): v is number => v != null);
  const decisionTimes = input.timeToConversion
    .map((t) => t.pilot_complete_to_commercial_decision?.duration_ms)
    .filter((v): v is number => v != null);

  return {
    accepted: input.funnelCounts.accepted_design_partners,
    integrated: input.funnelCounts.integration_started,
    successful_verification: input.funnelCounts.first_successful_verification,
    pilot_complete: input.funnelCounts.pilot_complete,
    production_active: input.funnelCounts.production_active,
    converted: input.funnelCounts.converted,
    median_time_to_first_verification_ms: median(verifyTimes),
    median_time_to_production_ms: median(prodTimes),
    median_time_to_commercial_decision_ms: median(decisionTimes),
    policy_expansion_observed: input.valueEvidence.filter((e) => e.policy_expansion_production.policy_expansion_observed).length,
    repeat_production_activity_observed: input.valueEvidence.filter((e) => e.repeat_activity.repeat_integration_activity).length,
    reuse_observed: input.valueEvidence.filter((e) => e.pilot_sandbox.metrics.evidence_reuse_count.value > 0).length,
    case_studies: {
      ready: input.caseStudyPublishability.filter((s) => s === "ready").length,
      partial: input.caseStudyPublishability.filter((s) => s === "partial").length,
      blocked: input.caseStudyPublishability.filter((s) => s === "blocked").length,
    },
    provenance: "partner_design_partner_program + partner_integration_events + operator_commercial_state",
  };
}
