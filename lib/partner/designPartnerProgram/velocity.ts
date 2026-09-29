// FILE: lib/partner/designPartnerProgram/velocity.ts
// Time-to-conversion from program + canonical events.

import type { DurationMetric } from "@/lib/partner/valueEvidence/contract";
import type { DesignPartnerProgramRow } from "./contract";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";

function duration(start: number | null, end: number | null, startEvent: string, endEvent: string): DurationMetric {
  if (start == null || end == null || end < start) {
    return { duration_ms: null, quality: "unavailable", start_event: startEvent, end_event: endEvent };
  }
  return { duration_ms: end - start, quality: "measured", start_event: startEvent, end_event: endEvent };
}

export function computeTimeToConversion(input: {
  program: DesignPartnerProgramRow;
  valueEvidence: ApplicationValueEvidence;
}): Record<string, DurationMetric> {
  const accepted = new Date(input.program.entered_at).getTime();
  const integration = input.valueEvidence.integration_velocity.application_created_to_first_sandbox_request;
  const firstVerify = input.valueEvidence.integration_velocity.application_created_to_first_successful_verification;
  const pilotLive = input.program.pilot_started_at ? new Date(input.program.pilot_started_at).getTime() : null;
  const pilotComplete = input.program.pilot_completed_at ? new Date(input.program.pilot_completed_at).getTime() : null;
  const decision = input.program.decision_recorded_at ? new Date(input.program.decision_recorded_at).getTime() : null;
  const production = input.valueEvidence.lifecycle.technical_stage === "production_active"
    && input.valueEvidence.pilot_sandbox.production_status.activated_at
    ? new Date(input.valueEvidence.pilot_sandbox.production_status.activated_at!).getTime()
    : null;
  const converted = input.program.decision_status === "converted" && decision ? decision : null;

  return {
    accepted_to_integration_started: duration(
      accepted,
      integration.quality === "measured" ? accepted + (integration.duration_ms ?? 0) : null,
      "program.entered_at",
      integration.end_event,
    ),
    accepted_to_first_successful_verification: duration(
      accepted,
      firstVerify.quality === "measured" ? accepted + (firstVerify.duration_ms ?? 0) : null,
      "program.entered_at",
      firstVerify.end_event,
    ),
    accepted_to_pilot_live: duration(accepted, pilotLive, "program.entered_at", "pilot_started_at"),
    pilot_live_to_pilot_complete: duration(pilotLive, pilotComplete, "pilot_started_at", "pilot_completed_at"),
    pilot_complete_to_commercial_decision: duration(pilotComplete, decision, "pilot_completed_at", "decision_recorded_at"),
    accepted_to_production_active: duration(accepted, production, "program.entered_at", "production_activated_at"),
    accepted_to_converted: duration(accepted, converted, "program.entered_at", "decision_recorded_at"),
  };
}
