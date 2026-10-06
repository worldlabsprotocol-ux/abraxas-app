// FILE: lib/partner/designPartnerProgram/cohorts.ts
// Basic design-partner cohort grouping.

import type { IcpProfileRow } from "@/lib/partner/valueEvidence/store";
import type { DesignPartnerProgramRow } from "./contract";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";

export type CohortDimension =
  | "accepted_month"
  | "industry_category"
  | "company_size_band"
  | "primary_use_case"
  | "initial_policy"
  | "integration_type"
  | "compliance_driver";

export interface CohortBucket {
  dimension: CohortDimension;
  value: string;
  sample_size: number;
  insufficient_sample: boolean;
  design_partners: number;
  pilot_complete: number;
  production_active: number;
  converted: number;
}

function cohortKey(program: DesignPartnerProgramRow, icp: IcpProfileRow | null, dimension: CohortDimension, evidence: ApplicationValueEvidence): string {
  switch (dimension) {
    case "accepted_month":
      return program.entered_at.slice(0, 7);
    case "industry_category":
      return icp?.industry_category ?? "unknown";
    case "company_size_band":
      return icp?.company_size_band ?? "unknown";
    case "primary_use_case":
      return icp?.initial_use_case ?? program.primary_use_case ?? "unknown";
    case "initial_policy":
      return program.initial_policy_pack ?? evidence.pilot_sandbox.policy_consumption[0]?.pack_id ?? "unknown";
    case "integration_type":
      return icp?.integration_type ?? "unknown";
    case "compliance_driver":
      return icp?.compliance_driver ?? "unknown";
    default:
      return "unknown";
  }
}

export function buildCohortAnalysis(input: {
  programs: DesignPartnerProgramRow[];
  icpProfiles: Map<string, IcpProfileRow | null>;
  valueEvidence: Map<string, ApplicationValueEvidence>;
  dimension: CohortDimension;
  minSample?: number;
}): CohortBucket[] {
  const min = input.minSample ?? 3;
  const buckets = new Map<string, CohortBucket>();

  for (const program of input.programs) {
    const icp = input.icpProfiles.get(program.application_id) ?? null;
    const evidence = input.valueEvidence.get(program.application_id);
    if (!evidence) continue;
    const value = cohortKey(program, icp, input.dimension, evidence);
    const bucket = buckets.get(value) ?? {
      dimension: input.dimension,
      value,
      sample_size: 0,
      insufficient_sample: true,
      design_partners: 0,
      pilot_complete: 0,
      production_active: 0,
      converted: 0,
    };
    bucket.sample_size++;
    bucket.design_partners++;
    if (program.pilot_completed_at) bucket.pilot_complete++;
    if (evidence.lifecycle.technical_stage === "production_active") bucket.production_active++;
    if (program.decision_status === "converted") bucket.converted++;
    buckets.set(value, bucket);
  }

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    insufficient_sample: b.sample_size < min,
  }));
}
