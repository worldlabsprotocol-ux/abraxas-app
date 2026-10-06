// FILE: lib/partner/designPartnerProgram/commercialModel.ts
// Commercial model learning — no billing, no ARR inference.

import type { CommercialStateRow, CommercialModelCandidate } from "@/lib/partner/valueEvidence/store";
import type { DesignPartnerProgramRow } from "./contract";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";

const MODELS: CommercialModelCandidate[] = [
  "platform_fee_plus_usage",
  "annual_contract_plus_usage",
  "usage_only",
  "pilot_free",
  "pilot_paid",
  "custom_evaluation",
  "undecided",
];

export function buildCommercialModelLearning(input: {
  programs: DesignPartnerProgramRow[];
  commercialStates: Map<string, CommercialStateRow | null>;
  valueEvidence: Map<string, ApplicationValueEvidence>;
}): Array<{
  model: CommercialModelCandidate | "none";
  partners_evaluating: number;
  converted: number;
  production_active: number;
  sample_size_warning: boolean;
}> {
  return MODELS.map((model) => {
    let evaluating = 0;
    let converted = 0;
    let productionActive = 0;
    for (const program of input.programs) {
      const commercial = input.commercialStates.get(program.application_id);
      const evidence = input.valueEvidence.get(program.application_id);
      if (commercial?.commercial_model_candidate !== model) continue;
      evaluating++;
      if (program.decision_status === "converted" || commercial.commercial_converted) converted++;
      if (evidence?.lifecycle.technical_stage === "production_active") productionActive++;
    }
    return {
      model,
      partners_evaluating: evaluating,
      converted,
      production_active: productionActive,
      sample_size_warning: evaluating < 5,
    };
  }).filter((row) => row.partners_evaluating > 0);
}
