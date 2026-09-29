// FILE: lib/partner/designPartnerProgram/programLifecycle.ts
// Compose program status from operator record + #497 technical lifecycle.

import type { PartnerLifecycleResolution } from "@/lib/partner/valueEvidence/contract";
import type { DesignPartnerProgramRow, ProgramStatus } from "./contract";

const STATUS_RANK: Record<ProgramStatus, number> = {
  candidate: 0,
  accepted: 1,
  integration: 2,
  pilot_ready: 3,
  pilot_live: 4,
  pilot_complete: 5,
  commercial_review: 6,
  converted: 7,
  paused: -1,
  declined: -2,
  not_converted: -3,
};

function lifecycleToProgramMax(lifecycle: PartnerLifecycleResolution): ProgramStatus {
  switch (lifecycle.technical_stage) {
    case "prospect":
      return "candidate";
    case "design_partner":
      return "accepted";
    case "sandbox_started":
      return "integration";
    case "integration_verified":
    case "pilot_ready":
      return "pilot_ready";
    case "pilot_live":
    case "pilot_evidence_available":
      return "pilot_live";
    case "production_requested":
    case "production_approved":
      return "pilot_complete";
    case "production_active":
      return "commercial_review";
    default:
      return "candidate";
  }
}

export function resolveEffectiveProgramStatus(input: {
  program: DesignPartnerProgramRow | null;
  lifecycle: PartnerLifecycleResolution;
  commercialConverted: boolean;
}): { effective_program_status: ProgramStatus; blockers: string[] } {
  const blockers: string[] = [];
  if (!input.program) {
    return { effective_program_status: lifecycleToProgramMax(input.lifecycle), blockers: ["not_enrolled"] };
  }

  if (["paused", "declined", "not_converted"].includes(input.program.program_status)) {
    return { effective_program_status: input.program.program_status, blockers };
  }

  if (input.commercialConverted || input.program.decision_status === "converted") {
    if (input.lifecycle.technical_stage !== "production_active") {
      blockers.push("converted_requires_production_active");
    }
    return { effective_program_status: "converted", blockers };
  }

  if (input.program.pilot_completed_at) {
    const max = lifecycleToProgramMax(input.lifecycle);
    const rank = Math.max(STATUS_RANK.pilot_complete, STATUS_RANK[max] ?? 0);
    const status = (Object.entries(STATUS_RANK).find(([, v]) => v === rank)?.[0] ?? "pilot_complete") as ProgramStatus;
    return { effective_program_status: status, blockers };
  }

  const technicalMax = lifecycleToProgramMax(input.lifecycle);
  const stored = input.program.program_status;

  if (STATUS_RANK[stored] > STATUS_RANK[technicalMax]) {
    blockers.push("program_status_exceeds_technical_evidence");
    return { effective_program_status: technicalMax, blockers };
  }

  if (STATUS_RANK[technicalMax] > STATUS_RANK[stored]) {
    return { effective_program_status: technicalMax, blockers };
  }

  return { effective_program_status: stored, blockers };
}
