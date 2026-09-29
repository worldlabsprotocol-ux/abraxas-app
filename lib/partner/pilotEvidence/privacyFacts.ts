// FILE: lib/partner/pilotEvidence/privacyFacts.ts
// Policy-level privacy-minimization facts. No holder-specific data.

import { POLICY_PACKS, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { PolicyPrivacyFacts } from "./contract";
import type { PolicyConsumptionRow } from "./contract";

const CANONICAL_PACKS: PolicyPackId[] = ["age_21_retail", "residency_us"];

export function privacyFactsForPack(packId: PolicyPackId): PolicyPrivacyFacts {
  const pack = POLICY_PACKS[packId];
  return {
    pack_id: packId,
    result_family: pack.disclosed_result,
    partner_receives: [pack.disclosed_result],
    partner_does_not_receive: [...pack.partner_does_not_receive],
    statement: `Partner receives signed ${pack.disclosed_result} only. Underlying identity attributes withheld.`,
  };
}

export function buildPrivacyFactsForPolicies(consumption: PolicyConsumptionRow[]): PolicyPrivacyFacts[] {
  const packIds = new Set<PolicyPackId>();
  for (const row of consumption) {
    if (row.pack_id && row.pack_id in POLICY_PACKS) {
      packIds.add(row.pack_id as PolicyPackId);
    }
  }
  if (!packIds.size) {
    return CANONICAL_PACKS.map((packId) => privacyFactsForPack(packId));
  }
  return Array.from(packIds).map((packId) => privacyFactsForPack(packId));
}
