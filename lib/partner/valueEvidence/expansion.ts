// FILE: lib/partner/valueEvidence/expansion.ts
// Policy, environment, and usage expansion evidence.

import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { PolicyExpansionEvidence } from "./contract";
import { filterByEnvironment, isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";

export function computePolicyExpansion(
  events: IntegrationEventRow[],
  environment: "sandbox" | "production",
): PolicyExpansionEvidence {
  const scoped = filterByEnvironment(events.filter(isLiveEvent), environment);
  const policyFirstAt = new Map<string, string>();
  for (const event of scoped) {
    if (!event.policy_id) continue;
    if (event.event_type !== "receipt_issued" && event.event_type !== "verification_request_created") continue;
    if (!policyFirstAt.has(event.policy_id)) policyFirstAt.set(event.policy_id, event.created_at);
  }
  const policies = Array.from(policyFirstAt.keys()).sort();
  const firstPolicy = policies[0] ?? null;
  const firstAt = firstPolicy ? policyFirstAt.get(firstPolicy)! : null;
  const secondPolicy = policies[1] ?? null;
  const additionalAt = secondPolicy ? policyFirstAt.get(secondPolicy)! : null;

  return {
    first_policy_used: firstPolicy,
    active_policy_count: policies.length,
    policies_used: policies,
    first_policy_at: firstAt,
    additional_policy_first_used_at: additionalAt,
    policy_expansion_observed: policies.length > 1,
    environment,
  };
}

export function computeEnvironmentExpansion(input: {
  sandboxSummary: PartnerPilotSummary;
  productionSummary: PartnerPilotSummary | null;
  productionActivated: boolean;
}): { environment_expansion_observed: boolean; evidence: string[] } {
  const sandboxUsage = input.sandboxSummary.metrics.total_requests.value > 0;
  const productionUsage = (input.productionSummary?.metrics.total_requests.value ?? 0) > 0;
  const evidence: string[] = [];
  if (sandboxUsage) evidence.push("sandbox_activity");
  if (productionUsage) evidence.push("production_activity");
  if (input.productionActivated) evidence.push("production_activated");
  return {
    environment_expansion_observed: sandboxUsage && (productionUsage || input.productionActivated),
    evidence,
  };
}

export function computeUsageExpansion(events: IntegrationEventRow[], environment: "sandbox" | "production"): {
  usage_expansion_observed: boolean;
  periods_with_activity: number;
  evidence: string;
} {
  const scoped = filterByEnvironment(events.filter(isLiveEvent), environment);
  const weeks = new Set<string>();
  for (const event of scoped) {
    if (event.event_type !== "holder_flow_completed" && event.event_type !== "receipt_verification_succeeded") continue;
    const d = new Date(event.created_at);
    const week = `${d.getUTCFullYear()}-W${Math.ceil((d.getUTCDate()) / 7)}`;
    weeks.add(week);
  }
  return {
    usage_expansion_observed: weeks.size > 1,
    periods_with_activity: weeks.size,
    evidence: "repeat_integration_activity_by_week",
  };
}

export function computeExpansionValuation(input: {
  policyExpansionProduction: PolicyExpansionEvidence;
  sandboxSummary: PartnerPilotSummary;
  productionSummary: PartnerPilotSummary | null;
  productionActivated: boolean;
}): {
  initial_policy: string | null;
  current_policy_count: number;
  first_production_activity: string | null;
  most_recent_production_activity: string | null;
  reuse_observed: boolean;
  classification: "expansion_observed" | "repeat_usage_observed" | "insufficient_history";
} {
  const prod = input.productionSummary;
  const initial = input.policyExpansionProduction.first_policy_used;
  const count = input.policyExpansionProduction.active_policy_count;
  const reuse = (prod?.metrics.evidence_reuse_count.value ?? 0) > 0;

  let classification: "expansion_observed" | "repeat_usage_observed" | "insufficient_history" = "insufficient_history";
  if (count > 1 || input.policyExpansionProduction.policy_expansion_observed) {
    classification = "expansion_observed";
  } else if ((prod?.metrics.repeat_request_count.value ?? 0) > 0 || reuse) {
    classification = "repeat_usage_observed";
  }

  return {
    initial_policy: initial,
    current_policy_count: count,
    first_production_activity: prod?.funnel.find((s) => s.stage === "first_production_request")?.first_at ?? null,
    most_recent_production_activity: prod?.time_window.to ?? null,
    reuse_observed: reuse,
    classification,
  };
}
