// FILE: lib/partner/designPartnerProgram/lostPilot.ts
// Non-conversion intelligence — reusable gaps vs one-off dependencies.

import type { FeatureRequestRow } from "@/lib/partner/valueEvidence/store";
import type { DesignPartnerProgramRow } from "./contract";

export function buildLostPilotIntelligence(input: {
  programs: DesignPartnerProgramRow[];
  featureRequests: FeatureRequestRow[];
}): {
  non_conversion_reasons: Record<string, number>;
  technical_blockers: string[];
  commercial_blockers: string[];
  product_gaps: { reusable: number; one_off: number; unknown: number };
  one_off_feature_dependencies: string[];
  reusable_feature_dependencies: string[];
  discipline_signals: Array<{ application_id: string; would_compound_platform: boolean | null; classification: string | null }>;
} {
  const reasons: Record<string, number> = {};
  const technicalBlockers = new Set<string>();
  const commercialBlockers = new Set<string>();

  for (const program of input.programs) {
    if (program.decision_status !== "not_converted" && program.program_status !== "not_converted") continue;
    for (const code of program.decision_reason_codes) {
      reasons[code] = (reasons[code] ?? 0) + 1;
      if (["integration_complexity", "missing_policy", "technical_fit", "security_review", "compliance_review"].includes(code)) {
        technicalBlockers.add(code);
      }
      if (["pricing", "budget", "timing", "internal_priority", "procurement"].includes(code)) {
        commercialBlockers.add(code);
      }
    }
    if (program.decision_reason_codes.includes("custom_feature_dependency")) {
      technicalBlockers.add("custom_feature_dependency");
    }
  }

  const relatedRequests = input.featureRequests.filter((f) =>
    input.programs.some((p) => p.application_id === f.application_id && p.decision_status === "not_converted"),
  );

  const productGaps = { reusable: 0, one_off: 0, unknown: 0 };
  const oneOff: string[] = [];
  const reusable: string[] = [];

  for (const req of relatedRequests) {
    if (req.classification === "custom_one_off" || req.reusable_across_market === "no") {
      productGaps.one_off++;
      oneOff.push(req.title);
    } else if (req.classification === "core_platform" || req.classification === "reusable_policy_capability" || req.reusable_across_market === "yes") {
      productGaps.reusable++;
      reusable.push(req.title);
    } else {
      productGaps.unknown++;
    }
  }

  const disciplineSignals = input.programs
    .filter((p) => p.decision_status === "not_converted")
    .map((p) => {
      const reqs = relatedRequests.filter((r) => r.application_id === p.application_id);
      const custom = reqs.find((r) => r.classification === "custom_one_off");
      return {
        application_id: p.application_id,
        would_compound_platform: custom
          ? false
          : reqs.some((r) => r.classification === "core_platform" || r.classification === "reusable_policy_capability")
            ? true
            : null,
        classification: custom?.classification ?? reqs[0]?.classification ?? null,
      };
    });

  return {
    non_conversion_reasons: reasons,
    technical_blockers: Array.from(technicalBlockers),
    commercial_blockers: Array.from(commercialBlockers),
    product_gaps: productGaps,
    one_off_feature_dependencies: oneOff,
    reusable_feature_dependencies: reusable,
    discipline_signals: disciplineSignals,
  };
}
