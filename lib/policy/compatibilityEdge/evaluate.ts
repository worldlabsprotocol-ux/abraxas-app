// FILE: lib/policy/compatibilityEdge/evaluate.ts
// Strict, non-transitive edge evaluation. Fail closed.

import { PRODUCTION_COMPATIBILITY_EDGES } from "./registry";
import {
  assuranceMeetsOrExceeds,
  type CompatibilityEvalReason,
  type CompatibilityFactSnapshot,
  type CompatibilityTargetSnapshot,
  type PolicyCompatibilityEdge,
} from "./types";

export function listRegistryEdges(registry?: readonly PolicyCompatibilityEdge[]): readonly PolicyCompatibilityEdge[] {
  return registry ?? PRODUCTION_COMPATIBILITY_EDGES;
}

function fieldsMatch(edge: PolicyCompatibilityEdge, fact: CompatibilityFactSnapshot, target: CompatibilityTargetSnapshot): boolean {
  return (
    edge.source_pack_id === fact.pack_id
    && edge.source_version === fact.policy_version
    && edge.target_pack_id === target.pack_id
    && edge.target_version === target.policy_version
    && edge.source_minimum_assurance === fact.minimum_assurance
    && edge.source_method_category === fact.method_category
    && edge.source_result_category === fact.result_category
    && edge.source_disclosure_boundary === fact.disclosure_boundary
    && edge.target_required_assurance === target.required_assurance
    && edge.target_method_category === target.method_category
    && edge.target_result_category === target.result_category
    && edge.target_disclosure_boundary === target.disclosure_boundary
  );
}

export function findDirectEdges(input: {
  sourcePackId: string;
  sourceVersion: number;
  targetPackId: string;
  targetVersion: number;
  registry?: readonly PolicyCompatibilityEdge[];
}): PolicyCompatibilityEdge[] {
  return listRegistryEdges(input.registry).filter((edge) =>
    edge.source_pack_id === input.sourcePackId
    && edge.source_version === input.sourceVersion
    && edge.target_pack_id === input.targetPackId
    && edge.target_version === input.targetVersion,
  );
}

export function isExactPackVersionMatch(fact: CompatibilityFactSnapshot, target: CompatibilityTargetSnapshot): boolean {
  return fact.pack_id === target.pack_id && fact.policy_version === target.policy_version;
}

function edgeIsLive(edge: PolicyCompatibilityEdge, now: Date): CompatibilityEvalReason | null {
  if (edge.status === "revoked") return "edge_inactive";
  if (edge.status === "deprecated") return "edge_inactive";
  if (edge.status !== "active") return "edge_inactive";
  if (new Date(edge.effective_at) > now) return "not_effective";
  if (edge.expires_at && new Date(edge.expires_at) <= now) return "edge_expired";
  return null;
}

function environmentAllowed(fact: CompatibilityFactSnapshot, target: CompatibilityTargetSnapshot, edge?: PolicyCompatibilityEdge): boolean {
  if (fact.decision_context === "sandbox_only" && !target.sandbox_only) return false;
  if (edge) {
    if (fact.decision_context === "sandbox_only" && edge.source_environment === "production") return false;
    if (!target.sandbox_only && edge.target_environment === "sandbox") return false;
    if (target.sandbox_only && edge.target_environment === "production" && fact.decision_context === "sandbox_only") {
      return edge.source_environment === "sandbox";
    }
  }
  return true;
}

function resultExpands(fact: CompatibilityFactSnapshot, target: CompatibilityTargetSnapshot): boolean {
  return target.result_category !== fact.result_category;
}

function disclosureExpands(fact: CompatibilityFactSnapshot, target: CompatibilityTargetSnapshot): boolean {
  const sourceWithheld = new Set(fact.disclosure_boundary.split("|")[1]?.split(",").filter(Boolean) ?? []);
  const targetWithheld = new Set(target.disclosure_boundary.split("|")[1]?.split(",").filter(Boolean) ?? []);
  for (const item of sourceWithheld) {
    if (!targetWithheld.has(item)) return true;
  }
  const sourceResult = fact.disclosure_boundary.split("|")[0];
  const targetResult = target.disclosure_boundary.split("|")[0];
  if (sourceResult !== targetResult) return true;
  return false;
}

export function evaluateCompatibility(input: {
  fact: CompatibilityFactSnapshot;
  target: CompatibilityTargetSnapshot;
  now?: Date;
  registry?: readonly PolicyCompatibilityEdge[];
}): { ok: true; reason: "exact_match" | "reviewed_edge" } | { ok: false; reason: CompatibilityEvalReason } {
  const now = input.now ?? new Date();
  if (input.fact.status === "revoked") return { ok: false, reason: "revoked" };
  if (input.fact.status === "expired" || (input.fact.expires_at && new Date(input.fact.expires_at) < now)) {
    return { ok: false, reason: "expired" };
  }
  if (!environmentAllowed(input.fact, input.target)) {
    return { ok: false, reason: "sandbox_blocked" };
  }
  if (resultExpands(input.fact, input.target)) {
    return { ok: false, reason: "result_expanded" };
  }
  if (disclosureExpands(input.fact, input.target)) {
    return { ok: false, reason: "disclosure_expanded" };
  }
  if (!assuranceMeetsOrExceeds(input.fact.minimum_assurance, input.target.required_assurance)) {
    return { ok: false, reason: "assurance_mismatch" };
  }

  if (isExactPackVersionMatch(input.fact, input.target)) {
    return { ok: true, reason: "exact_match" };
  }

  const candidates = findDirectEdges({
    sourcePackId: input.fact.pack_id,
    sourceVersion: input.fact.policy_version,
    targetPackId: input.target.pack_id,
    targetVersion: input.target.policy_version,
    registry: input.registry,
  });

  let denial: CompatibilityEvalReason = "incompatible";
  for (const edge of candidates) {
    const live = edgeIsLive(edge, now);
    if (live) {
      denial = live;
      continue;
    }
    if (!fieldsMatch(edge, input.fact, input.target)) {
      denial = "incompatible";
      continue;
    }
    if (!environmentAllowed(input.fact, input.target, edge)) {
      denial = "sandbox_blocked";
      continue;
    }
    if (!assuranceMeetsOrExceeds(input.fact.minimum_assurance, edge.target_required_assurance)) {
      denial = "assurance_mismatch";
      continue;
    }
    if (!assuranceMeetsOrExceeds(input.fact.minimum_assurance, edge.source_minimum_assurance)) {
      denial = "assurance_mismatch";
      continue;
    }
    return { ok: true, reason: "reviewed_edge" };
  }
  return { ok: false, reason: denial };
}

export function hasActiveReviewedContinuity(input: {
  sourcePackId: string;
  sourceVersion: number;
  targetPackId: string;
  targetVersion: number;
  now?: Date;
  registry?: readonly PolicyCompatibilityEdge[];
}): boolean {
  const now = input.now ?? new Date();
  const productionOnly = input.registry == null;
  return findDirectEdges(input).some((edge) =>
    edgeIsLive(edge, now) == null
    && edge.compatibility_type === "exact_continuity"
    && (!productionOnly || !edge.test_only),
  );
}

export function mapEvalReasonToReuseState(reason: CompatibilityEvalReason):
  | "incompatible"
  | "expired"
  | "revoked"
  | "sandbox_blocked"
  | "none" {
  if (reason === "expired") return "expired";
  if (reason === "revoked") return "revoked";
  if (reason === "sandbox_blocked") return "sandbox_blocked";
  if (reason === "exact_match" || reason === "reviewed_edge") return "none";
  return "incompatible";
}
