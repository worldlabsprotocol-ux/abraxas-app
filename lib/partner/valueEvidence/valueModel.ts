// FILE: lib/partner/valueEvidence/valueModel.ts
// Internal Abraxas value dimension model — what have we proven?

import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { AbraxasValueDimension, ValueDimensionReport, PolicyExpansionEvidence } from "./contract";
import type { PartnerLifecycleResolution } from "./contract";
import type { DurationMetric } from "./contract";
import type { UnitEconomicsReadiness } from "./contract";

export function buildAbraxasValueModel(input: {
  pilotSandbox: PartnerPilotSummary;
  pilotProduction: PartnerPilotSummary | null;
  lifecycle: PartnerLifecycleResolution;
  velocity: Record<string, DurationMetric>;
  policyExpansionProduction: PolicyExpansionEvidence;
  unitEconomics: UnitEconomicsReadiness;
  repeatActivity: { repeat_integration_activity: boolean; periods_with_verification: number };
}): Record<AbraxasValueDimension, ValueDimensionReport> {
  const sandbox = input.pilotSandbox;
  const production = input.pilotProduction;

  return {
    integration_velocity: {
      status: input.velocity.application_created_to_first_successful_verification.quality === "measured"
        ? "measured" : "partially_measured",
      evidence: {
        durations: input.velocity,
        lifecycle_stage: input.lifecycle.technical_stage,
      },
      limitations: ["Requires durable integration events with application_id"],
    },
    production_conversion: {
      status: input.lifecycle.technical_stage === "production_active" ? "measured" : "partially_measured",
      evidence: {
        technical_stage: input.lifecycle.technical_stage,
        production_activated: sandbox.production_status.activated,
      },
      limitations: ["Commercial conversion requires operator assertion"],
    },
    verification_usage: {
      status: sandbox.metrics.verification_attempts.value > 0 ? "measured" : "unavailable",
      evidence: {
        sandbox: sandbox.metrics.verification_attempts.value,
        production: production?.metrics.verification_attempts.value ?? 0,
        success_rate: sandbox.metrics.verification_success_rate.value,
      },
      limitations: ["Off-platform verifyForAction without applicationId may be invisible"],
    },
    evidence_reuse: {
      status: sandbox.metrics.evidence_reuse_count.value > 0 ? "measured" : "partially_measured",
      evidence: {
        reuse_count: sandbox.metrics.evidence_reuse_count.value,
        refresh_count: sandbox.metrics.evidence_refresh_required_count.value,
        reuse_rate: sandbox.metrics.reuse_rate.value,
      },
      limitations: ["No dollar savings without cost data"],
    },
    policy_expansion: {
      status: input.policyExpansionProduction.policy_expansion_observed ? "measured" : "partially_measured",
      evidence: { ...input.policyExpansionProduction },
      limitations: ["Sandbox policy tests do not count as production expansion"],
    },
    partner_retention: {
      status: input.repeatActivity.repeat_integration_activity ? "measured" : "partially_measured",
      evidence: input.repeatActivity,
      limitations: ["Not NRR/GRR — repeat integration activity only"],
    },
    holder_reuse: {
      status: "unavailable",
      evidence: { repeat_holder_usage: sandbox.metrics.repeat_holder_usage },
      limitations: [
        "Holder pseudonym not stored in partner_integration_events",
        "Aggregate holder reuse requires future privacy-preserving primitive",
      ],
    },
    unit_economics: {
      status: unitEconomicsStatus(input.unitEconomics),
      evidence: { ...input.unitEconomics, measurable_inputs: { ...input.unitEconomics.measurable_inputs } },
      limitations: input.unitEconomics.missing_inputs,
    },
    customer_value: {
      status: "unavailable",
      evidence: {},
      limitations: ["Customer ROI and quotes require operator/customer input — never inferred from usage"],
    },
  };
}

function unitEconomicsStatus(ready: UnitEconomicsReadiness): ValueDimensionReport["status"] {
  const measurable = Object.values(ready.measurable_inputs).some((v) => v != null && v > 0);
  if (measurable && ready.reusable_verification_rate === "derived") return "partially_measured";
  if (measurable) return "partially_measured";
  return "unavailable";
}
