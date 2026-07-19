// FILE: lib/authenticationProof/policyVersion.ts

import { DEFAULT_POLICY_VERSION } from "@/lib/partner/partnerDecision";

/** Map policy version string (e.g. 2026-07-08) to receipt integer version. */
export function parsePolicyVersionNumber(version: string = DEFAULT_POLICY_VERSION): number {
  const digits = version.replace(/\D/g, "");
  const n = parseInt(digits.slice(0, 8), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
