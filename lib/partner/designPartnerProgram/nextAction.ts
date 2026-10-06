// FILE: lib/partner/designPartnerProgram/nextAction.ts
// Deterministic operator/partner next action from state.

import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { DesignPartnerProgramRow, EvaluatedCriterion, ProgramStatus } from "./contract";

export function deriveNextAction(input: {
  program: DesignPartnerProgramRow | null;
  effectiveStatus: ProgramStatus;
  pilotSandbox: PartnerPilotSummary;
  criteria: EvaluatedCriterion[];
  blockers: string[];
}): string {
  if (!input.program) return "enroll_in_design_partner_program";
  if (input.program.pilot_completed_at && input.program.decision_status === "pending") {
    return "record_commercial_decision";
  }
  if (input.effectiveStatus === "candidate") return "accept_design_partner";
  if (input.pilotSandbox.integration_status === "blocked") return "resolve_callback_failure";
  if (input.pilotSandbox.integration_status === "degraded") return "resolve_integration_degradation";
  const pendingCriteria = input.criteria.filter((c) => c.status === "pending");
  if (pendingCriteria.length > 0 && ["pilot_live", "pilot_ready", "integration"].includes(input.effectiveStatus)) {
    return "collect_missing_pilot_evidence";
  }
  if (input.effectiveStatus === "pilot_live" && !input.program.pilot_completed_at) {
    return "close_pilot";
  }
  if (input.effectiveStatus === "pilot_complete" && input.program.decision_status === "pending") {
    return "record_commercial_decision";
  }
  const productionRequested = input.pilotSandbox.funnel.some(
    (s) => s.stage === "production_requested" && s.status === "observed",
  );
  if (productionRequested) return "await_production_review";
  if (input.blockers.includes("converted_requires_production_active")) {
    return "request_production_review";
  }
  if (["integration", "pilot_ready", "accepted"].includes(input.effectiveStatus)) {
    return "complete_sandbox_integration";
  }
  return "monitor_pilot_progress";
}

export function derivePartnerNextAction(input: {
  effectiveStatus: ProgramStatus;
  pilotSandbox: PartnerPilotSummary;
  criteria: EvaluatedCriterion[];
}): string {
  if (input.pilotSandbox.integration_status === "not_started") return "complete_sandbox_integration";
  if (input.pilotSandbox.integration_status === "blocked") return "resolve_callback_failure";
  const unmet = input.criteria.filter((c) => c.status === "not_met" || c.status === "pending");
  if (unmet.length > 0) return "complete_pilot_success_criteria";
  if (input.effectiveStatus === "pilot_live") return "continue_pilot_usage";
  return "monitor_integration_health";
}
