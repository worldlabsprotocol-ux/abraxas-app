// FILE: lib/partner/designPartnerProgram/funnel.ts
// Design partner conversion funnel with sample-size integrity.

import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import type { DesignPartnerProgramRow } from "./contract";
import type { PilotScorecard } from "./contract";
import type { SampleSizedRate } from "@/lib/partner/valueEvidence/contract";
import { resolveEffectiveProgramStatus } from "./programLifecycle";

export interface DesignPartnerFunnelCounts {
  candidates: number;
  accepted_design_partners: number;
  integration_started: number;
  first_successful_verification: number;
  pilot_live: number;
  pilot_complete: number;
  production_active: number;
  commercial_review: number;
  converted: number;
}

function rate(numerator: number, denominator: number): SampleSizedRate {
  return {
    numerator,
    denominator,
    rate: denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null,
    sample_size_warning: denominator < 5,
  };
}

export function buildDesignPartnerFunnel(input: {
  programs: DesignPartnerProgramRow[];
  scorecards: Array<PilotScorecard | null>;
  valueEvidence: ApplicationValueEvidence[];
}): {
  counts: DesignPartnerFunnelCounts;
  integration_to_verification: SampleSizedRate;
  accepted_to_converted: SampleSizedRate;
} {
  const counts: DesignPartnerFunnelCounts = {
    candidates: input.programs.filter((p) => p.program_status === "candidate" || p.entered_at).length,
    accepted_design_partners: input.programs.filter((p) =>
      !["candidate", "declined"].includes(p.program_status) || p.program_status === "accepted",
    ).length,
    integration_started: 0,
    first_successful_verification: 0,
    pilot_live: 0,
    pilot_complete: 0,
    production_active: 0,
    commercial_review: 0,
    converted: 0,
  };

  for (let i = 0; i < input.programs.length; i++) {
    const program = input.programs[i]!;
    const evidence = input.valueEvidence[i];
    const scorecard = input.scorecards[i];
    if (!evidence) continue;

    const effective = scorecard?.effective_program_status
      ?? resolveEffectiveProgramStatus({
        program,
        lifecycle: evidence.lifecycle,
        commercialConverted: evidence.commercial_state?.commercial_converted ?? false,
      }).effective_program_status;

    if (["integration", "pilot_ready", "pilot_live", "pilot_complete", "commercial_review", "converted"].includes(effective)) {
      counts.integration_started++;
    }
    if (evidence.pilot_sandbox.metrics.successful_receipt_verifications.value > 0) {
      counts.first_successful_verification++;
    }
    if (["pilot_live", "pilot_complete", "commercial_review", "converted"].includes(effective)) {
      counts.pilot_live++;
    }
    if (program.pilot_completed_at || effective === "pilot_complete") {
      counts.pilot_complete++;
    }
    if (evidence.lifecycle.technical_stage === "production_active") {
      counts.production_active++;
    }
    if (effective === "commercial_review" || program.decision_status === "pending" && program.pilot_completed_at) {
      counts.commercial_review++;
    }
    if (program.decision_status === "converted" || evidence.commercial_state?.commercial_converted) {
      counts.converted++;
    }
  }

  return {
    counts,
    integration_to_verification: rate(counts.first_successful_verification, counts.integration_started),
    accepted_to_converted: rate(counts.converted, counts.accepted_design_partners),
  };
}
