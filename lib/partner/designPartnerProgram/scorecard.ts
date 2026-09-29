// FILE: lib/partner/designPartnerProgram/scorecard.ts
// Evidence scorecard — no vanity numeric score.

import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import type { DesignPartnerProgramRow } from "./contract";
import type { CriteriaRow } from "./store";
import { evaluateAllCriteria, deriveTechnicalOutcome } from "./criteria";
import { resolveEffectiveProgramStatus } from "./programLifecycle";
import { deriveNextAction } from "./nextAction";
import type { PilotScorecard } from "./contract";

export function buildDesignPartnerPilotScorecard(input: {
  program: DesignPartnerProgramRow | null;
  criteria: CriteriaRow[];
  valueEvidence: ApplicationValueEvidence;
}): PilotScorecard | null {
  if (!input.program) return null;

  const evaluated = evaluateAllCriteria({
    criteria: input.criteria,
    pilotSandbox: input.valueEvidence.pilot_sandbox,
    pilotProduction: input.valueEvidence.pilot_production,
    valueEvidence: input.valueEvidence,
  });

  const { effective_program_status, blockers } = resolveEffectiveProgramStatus({
    program: input.program,
    lifecycle: input.valueEvidence.lifecycle,
    commercialConverted: input.valueEvidence.commercial_state?.commercial_converted ?? false,
  });

  const technicalOutcome = input.program.technical_outcome ?? deriveTechnicalOutcome(evaluated);
  const met = evaluated.filter((c) => c.status === "met").length;
  const notMet = evaluated.filter((c) => c.status === "not_met").length;
  const pending = evaluated.filter((c) => c.status === "pending").length;
  const unavailable = evaluated.filter((c) => c.status === "unavailable").length;

  const hasMeasured = evaluated.some((c) => c.quality === "system_measured" || c.quality === "derived");
  const evidenceQuality = hasMeasured ? "system_measured" as const : "unavailable" as const;

  return {
    partner_id: input.program.partner_id,
    application_id: input.program.application_id,
    program_status: input.program.program_status,
    effective_program_status,
    criteria: evaluated,
    criteria_met: met,
    criteria_not_met: notMet,
    criteria_pending: pending,
    criteria_unavailable: unavailable,
    technical_outcome: technicalOutcome,
    commercial_outcome: input.program.decision_status,
    evidence_quality: evidenceQuality,
    blockers,
    next_action: deriveNextAction({
      program: input.program,
      effectiveStatus: effective_program_status,
      pilotSandbox: input.valueEvidence.pilot_sandbox,
      criteria: evaluated,
      blockers,
    }),
  };
}
