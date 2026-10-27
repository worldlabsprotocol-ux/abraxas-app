/**
 * Minimal permit / deny / indeterminate mapping for portable verification (copy-friendly).
 */
import {
  enforcementFromIndependentVerification,
  type IndependentEnforcementAction,
} from "../../packages/abraxas-independent-verifier/src/enforceIndependent";
import type { IndependentVerificationResult } from "../../packages/abraxas-independent-verifier/src/index";

export type EnforcementAction = IndependentEnforcementAction;

export function enforcementFromVerification(result: IndependentVerificationResult): {
  action: EnforcementAction;
  failure_codes: string[];
} {
  return enforcementFromIndependentVerification(result);
}
