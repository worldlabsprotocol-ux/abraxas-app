// FILE: lib/policy/compatibilityEdge/index.ts

export {
  POLICY_COMPATIBILITY_EDGE_VERSION,
  POLICY_COMPATIBILITY_NOTICE,
  REUSABLE_CONTINUITY_REVIEWED_LABEL,
  canonicalizeDisclosureBoundary,
  assuranceMeetsOrExceeds,
  type PolicyCompatibilityEdge,
  type CompatibilityFactSnapshot,
  type CompatibilityTargetSnapshot,
  type CompatibilityEvalReason,
} from "./types";
export { PRODUCTION_COMPATIBILITY_EDGES, productionActiveEdgeCount } from "./registry";
export {
  evaluateCompatibility,
  findDirectEdges,
  hasActiveReviewedContinuity,
  isExactPackVersionMatch,
  mapEvalReasonToReuseState,
  listRegistryEdges,
} from "./evaluate";
