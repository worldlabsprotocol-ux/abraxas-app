// FILE: lib/partner/twoAppEvaluation/partnerSummary.ts
// Partner-facing summary — observed facts only.

import type { TwoAppPartnerSummary, TwoAppSuccessCriteriaResult } from "./contract";
import type { TwoAppTimeToValue } from "./contract";
import { formatDurationMs } from "./timeToValue";

export function buildPartnerSummary(input: {
  success: TwoAppSuccessCriteriaResult;
  time_to_value: TwoAppTimeToValue;
}): TwoAppPartnerSummary | null {
  if (!input.success.all_met) {
    return {
      headline: "Evaluation in progress",
      bullets: [
        "Complete App A verification and server-side receipt verification first.",
        "Configure App B and attempt reuse with compatible policy.",
        "Evidence remains NOT YET OBSERVED until reuse is accepted and both results are server-verified.",
      ],
      time_to_first_result: formatDurationMs(input.time_to_value.evaluation_start_to_first_verified_result_ms),
      time_to_reuse: formatDurationMs(input.time_to_value.evaluation_start_to_reuse_success_ms),
      evidence_status: "NOT YET OBSERVED",
    };
  }

  return {
    headline: "WHAT YOU PROVED",
    bullets: [
      "Your team connected two sandbox applications.",
      "A verified result was produced for App A.",
      "Compatible evidence was reused for App B.",
      "Both results were verified through Abraxas's supported partner interface.",
      "No prohibited identity fields appeared in the relying-application result.",
    ],
    time_to_first_result: formatDurationMs(input.time_to_value.evaluation_start_to_first_verified_result_ms),
    time_to_reuse: formatDurationMs(input.time_to_value.evaluation_start_to_reuse_success_ms),
    evidence_status: "OBSERVED",
  };
}
