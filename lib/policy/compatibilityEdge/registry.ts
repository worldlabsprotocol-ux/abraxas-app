// FILE: lib/policy/compatibilityEdge/registry.ts
// Production registry: server-owned source. No client create/edit/select/override.

import type { PolicyCompatibilityEdge } from "./types";

/**
 * Initial Production decision: no active cross-pack or cross-version edges.
 *
 * age_21_retail catalog successor v2 is planning-only (POLICY_PACK_CATALOG_VERSION is 1).
 * Unchanged planner comparison is not a live identical contract, so it is not published
 * as Production exact_continuity. Test fixtures may exercise evaluation without enabling
 * age, residency, membership, identity, sandbox, trading, payment, or custom-policy crossover.
 */
export const PRODUCTION_COMPATIBILITY_EDGES: readonly PolicyCompatibilityEdge[] = [];

export function productionActiveEdgeCount(): number {
  return PRODUCTION_COMPATIBILITY_EDGES.filter((edge) => edge.status === "active" && !edge.test_only).length;
}
