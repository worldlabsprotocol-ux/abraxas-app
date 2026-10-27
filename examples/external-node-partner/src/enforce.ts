import {
  enforcementFromIndependentVerification,
  type IndependentEnforcementAction,
} from "@abraxas/independent-verifier";

export type EnforcementAction = IndependentEnforcementAction;

export function enforcementFromVerification(
  result: Parameters<typeof enforcementFromIndependentVerification>[0],
): {
  action: EnforcementAction;
  failure_codes: string[];
} {
  return enforcementFromIndependentVerification(result);
}
