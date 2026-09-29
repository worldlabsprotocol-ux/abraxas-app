// FILE: lib/partner/designPartnerProgram/icpEvidence.ts
// ICP evidence from real partner behavior.

import { buildCohortAnalysis, type CohortDimension } from "./cohorts";
import type { DesignPartnerProgramRow } from "./contract";
import type { IcpProfileRow } from "@/lib/partner/valueEvidence/store";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";

export function buildICPEvidence(input: {
  programs: DesignPartnerProgramRow[];
  icpProfiles: Map<string, IcpProfileRow | null>;
  valueEvidence: Map<string, ApplicationValueEvidence>;
}): {
  cohorts: ReturnType<typeof buildCohortAnalysis>[];
  by_industry: ReturnType<typeof buildCohortAnalysis>;
  by_integration_type: ReturnType<typeof buildCohortAnalysis>;
  by_company_size: ReturnType<typeof buildCohortAnalysis>;
  limitations: string[];
} {
  const dimensions: CohortDimension[] = ["industry_category", "integration_type", "company_size_band", "compliance_driver"];
  const cohorts = dimensions.map((dimension) => buildCohortAnalysis({
    programs: input.programs,
    icpProfiles: input.icpProfiles,
    valueEvidence: input.valueEvidence,
    dimension,
  }));

  return {
    cohorts,
    by_industry: cohorts[0] ?? [],
    by_integration_type: cohorts[1] ?? [],
    by_company_size: cohorts[2] ?? [],
    limitations: [
      "ICP rankings withheld when sample_size < 3",
      "No inferred revenue or ACV by segment",
    ],
  };
}
