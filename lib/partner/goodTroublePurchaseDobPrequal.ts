// FILE: lib/partner/goodTroublePurchaseDobPrequal.ts
// Transient DOB intake for canonical Good Trouble purchase — never persists DOB.

import { deriveSelfAttestedAgeBand, parseIsoDateUtc } from "@/lib/assurance/selfAttestation/calculateAgeBand";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";

const MINIMUM_AGE = 21;

export type DobPrequalResult =
  | { ok: true; age_band: "over_21" | "under_21"; valid_for_authoritative_decision: false }
  | { ok: false; code: string; status: number };

export function evaluateGoodTroublePurchaseDobPrequal(input: {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
  dateOfBirth: string;
}): DobPrequalResult {
  if (!isCanonicalGoodTroublePurchaseFlow(input)) {
    return { ok: false, code: "flow_not_eligible", status: 403 };
  }
  if (input.partnerId.trim() !== GOOD_TROUBLE_CANONICAL_PARTNER_ID) {
    return { ok: false, code: "partner_mismatch", status: 400 };
  }
  if (input.policyId.trim() !== GOOD_TROUBLE_CANONICAL_POLICY_ID) {
    return { ok: false, code: "policy_mismatch", status: 400 };
  }

  const parsed = parseIsoDateUtc(input.dateOfBirth);
  if (!parsed.ok) {
    return { ok: false, code: parsed.code, status: 400 };
  }

  const ageBand = deriveSelfAttestedAgeBand(parsed.dobUtc, MINIMUM_AGE);
  return {
    ok: true,
    age_band: ageBand,
    valid_for_authoritative_decision: false,
  };
}
