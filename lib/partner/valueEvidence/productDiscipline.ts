// FILE: lib/partner/valueEvidence/productDiscipline.ts
// Platform-compounding vs one-off work classification.

import type { FeatureRequestRow } from "./store";
import { CAPITAL_DISCIPLINE_PRINCIPLE } from "./contract";

export function summarizeProductDiscipline(requests: FeatureRequestRow[]): {
  principle: typeof CAPITAL_DISCIPLINE_PRINCIPLE;
  total_requests: number;
  reusable_count: number;
  one_off_count: number;
  one_off_blocking_production: number;
  by_classification: Record<string, number>;
  compounding_ratio: number | null;
} {
  const reusable = requests.filter((r) =>
    r.reusable_across_market === "yes"
    || r.classification === "core_platform"
    || r.classification === "reusable_policy_capability",
  ).length;
  const oneOff = requests.filter((r) =>
    r.classification === "custom_one_off" || r.reusable_across_market === "no",
  ).length;
  const blocking = requests.filter((r) => r.blocks_production && r.classification === "custom_one_off").length;
  const byClass: Record<string, number> = {};
  for (const row of requests) {
    byClass[row.classification] = (byClass[row.classification] ?? 0) + 1;
  }
  const total = requests.length;
  return {
    principle: CAPITAL_DISCIPLINE_PRINCIPLE,
    total_requests: total,
    reusable_count: reusable,
    one_off_count: oneOff,
    one_off_blocking_production: blocking,
    by_classification: byClass,
    compounding_ratio: total > 0 ? Number((reusable / total).toFixed(4)) : null,
  };
}
