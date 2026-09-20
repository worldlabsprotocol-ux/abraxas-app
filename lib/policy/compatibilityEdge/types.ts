// FILE: lib/policy/compatibilityEdge/types.ts
// Dependency-neutral compatibility-edge model. Server-owned configuration only.

export const POLICY_COMPATIBILITY_EDGE_VERSION = "1.0.0" as const;

export const COMPATIBILITY_EDGE_STATUSES = ["active", "deprecated", "revoked"] as const;
export type CompatibilityEdgeStatus = (typeof COMPATIBILITY_EDGE_STATUSES)[number];

export const COMPATIBILITY_TYPES = ["exact_continuity", "reviewed_equivalence"] as const;
export type CompatibilityType = (typeof COMPATIBILITY_TYPES)[number];

export const COMPATIBILITY_ENVIRONMENTS = ["sandbox", "production"] as const;
export type CompatibilityEnvironment = (typeof COMPATIBILITY_ENVIRONMENTS)[number];

export type CompatibilityEvalReason =
  | "exact_match"
  | "reviewed_edge"
  | "incompatible"
  | "expired"
  | "revoked"
  | "sandbox_blocked"
  | "edge_inactive"
  | "edge_expired"
  | "assurance_mismatch"
  | "result_expanded"
  | "disclosure_expanded"
  | "not_effective";

export interface PolicyCompatibilityEdge {
  edge_id: string;
  source_pack_id: string;
  source_version: number;
  target_pack_id: string;
  target_version: number;
  source_minimum_assurance: string;
  target_required_assurance: string;
  source_method_category: string;
  target_method_category: string;
  source_result_category: string;
  target_result_category: string;
  source_disclosure_boundary: string;
  target_disclosure_boundary: string;
  source_environment: CompatibilityEnvironment;
  target_environment: CompatibilityEnvironment;
  status: CompatibilityEdgeStatus;
  effective_at: string;
  expires_at: string | null;
  rationale: string;
  compatibility_type: CompatibilityType;
  test_only?: boolean;
}

export interface CompatibilityFactSnapshot {
  pack_id: string;
  policy_version: number;
  minimum_assurance: string;
  method_category: string;
  result_category: string;
  disclosure_boundary: string;
  decision_context: "production" | "sandbox_only";
  status: "active" | "expired" | "revoked";
  expires_at: string | null;
}

export interface CompatibilityTargetSnapshot {
  pack_id: string;
  policy_version: number;
  required_assurance: string;
  method_category: string;
  result_category: string;
  disclosure_boundary: string;
  sandbox_only: boolean;
}

export const ASSURANCE_RANK: Record<string, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export function canonicalizeDisclosureBoundary(resultCategory: string, withheld: readonly string[]): string {
  return `${resultCategory}|${[...withheld].map((item) => item.trim()).filter(Boolean).sort().join(",")}`;
}

export function assuranceMeetsOrExceeds(source: string, required: string): boolean {
  const left = ASSURANCE_RANK[source];
  const right = ASSURANCE_RANK[required];
  if (left == null || right == null) return false;
  return left >= right;
}

export const POLICY_COMPATIBILITY_NOTICE =
  "Cross-version reuse is allowed only through a reviewed, server-owned compatibility edge. Similarity of labels, categories, or version numbers is not equivalence. The registry is not legal compliance, KYC, or a zero-knowledge proof.";

export const REUSABLE_CONTINUITY_REVIEWED_LABEL = "Reusable continuity reviewed" as const;
