// FILE: lib/partner/pilotEvidence/summary.ts
// buildPartnerPilotSummary — canonical pilot evidence from real events.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationOperationalHealth } from "@/lib/partner/integrationObservability/health";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadActivityRow } from "./load";
import {
  DEDUPLICATION_NOTICE,
  PILOT_EVIDENCE_NOTICE,
  PILOT_EVIDENCE_VERSION,
  type PartnerPilotSummary,
  type PilotEnvironment,
} from "./contract";
import { buildPartnerFunnel } from "./funnel";
import {
  computePartnerValueMetrics,
  computePolicyConsumption,
  computeTimeToValueMetrics,
} from "./metrics";
import { buildPrivacyFactsForPolicies } from "./privacyFacts";
import { buildCaseStudyEvidence } from "./caseStudy";
import { filterByEnvironment } from "./dedupe";

export function resolveIntegrationStatus(
  metrics: ReturnType<typeof computePartnerValueMetrics>,
  health?: IntegrationOperationalHealth | null,
): PartnerPilotSummary["integration_status"] {
  if (health?.status === "blocked") return "blocked";
  if (metrics.completed_holder_flows.value === 0 && metrics.verification_attempts.value === 0) {
    return "not_started";
  }
  if (health?.status === "degraded" || metrics.failed_receipt_verifications.value > 0) {
    return "degraded";
  }
  return "working";
}

export function buildPartnerPilotSummary(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  activity: LaunchpadActivityRow[];
  environment: PilotEnvironment;
  from?: Date | null;
  to?: Date | null;
  health?: IntegrationOperationalHealth | null;
  webhookStatus?: PartnerPilotSummary["reliability"]["webhook_status"];
}): PartnerPilotSummary {
  const scopedEvents = filterByEnvironment(input.events, input.environment);
  const metrics = computePartnerValueMetrics(scopedEvents);
  const timeToValue = computeTimeToValueMetrics({
    application: input.application,
    events: scopedEvents,
    activity: input.activity,
    environment: input.environment,
  });
  const policyConsumption = computePolicyConsumption(scopedEvents);
  const funnel = buildPartnerFunnel({
    application: input.application,
    events: scopedEvents,
    activity: input.activity,
    environment: input.environment,
  });

  const safeFailures = scopedEvents
    .map((event) => event.partner_safe_reason)
    .filter((code): code is NonNullable<typeof code> => Boolean(code));
  const uniqueFailures = Array.from(new Set(safeFailures)).slice(0, 10);

  const summary: PartnerPilotSummary = {
    contract_version: PILOT_EVIDENCE_VERSION,
    partner_id: input.application.partner_id,
    application_id: input.application.id,
    environment: input.environment,
    time_window: {
      from: input.from?.toISOString() ?? null,
      to: input.to?.toISOString() ?? null,
    },
    integration_status: resolveIntegrationStatus(metrics, input.health),
    production_status: {
      activated: Boolean(input.application.production_activated_at),
      activated_at: input.application.production_activated_at ?? null,
    },
    funnel,
    metrics,
    time_to_value: timeToValue,
    policy_consumption: policyConsumption,
    privacy_facts: buildPrivacyFactsForPolicies(policyConsumption),
    reliability: {
      verification_attempts: metrics.verification_attempts.value,
      verification_successes: metrics.successful_receipt_verifications.value,
      verification_failures: metrics.failed_receipt_verifications.value,
      safe_failure_categories: uniqueFailures,
      webhook_status: input.webhookStatus ?? input.health?.webhook_status ?? "unknown",
      callback_status: input.health?.callback_status ?? "missing",
      credential_status: input.health?.credential_status ?? "never_issued",
    },
    case_study: {} as PartnerPilotSummary["case_study"],
    deduplication_notice: DEDUPLICATION_NOTICE,
    notice: PILOT_EVIDENCE_NOTICE,
  };

  summary.case_study = buildCaseStudyEvidence(summary);
  return summary;
}
