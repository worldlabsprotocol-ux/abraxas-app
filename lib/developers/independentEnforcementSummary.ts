// FILE: lib/developers/independentEnforcementSummary.ts
// Map independent verification to builder-facing enforcement language.

import {
  enforcementFromIndependentVerification,
  type IndependentEnforcementAction,
} from "@abraxas/independent-verifier";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

export type BuilderEnforcementSummary = {
  action: IndependentEnforcementAction;
  headline: string;
  detail: string;
  failure_codes: string[];
};

export function summarizeIndependentEnforcement(
  verified: IndependentVerificationResult,
): BuilderEnforcementSummary {
  const { action, failure_codes } = enforcementFromIndependentVerification(verified);
  if (action === "permit") {
    return {
      action,
      failure_codes,
      headline: "Independent check: permit",
      detail:
        "A separate relying-party process verified the signed receipt and would allow the protected action.",
    };
  }
  if (action === "deny") {
    return {
      action,
      failure_codes,
      headline: "Independent check: deny",
      detail:
        "Independent verification completed, but the receipt is not currently acceptable for authorization.",
    };
  }
  return {
    action,
    failure_codes,
    headline: "Independent check: indeterminate",
    detail:
      "Independent verification could not reach a permit or deny conclusion. Withhold authorization until resolved.",
  };
}
