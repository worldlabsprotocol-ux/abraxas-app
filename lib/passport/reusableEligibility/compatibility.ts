// FILE: lib/passport/reusableEligibility/compatibility.ts
// Exact pack+version reuse, then a reviewed compatibility-edge registry. Never infer.

import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import {
  canonicalizeDisclosureBoundary,
  evaluateCompatibility,
  findDirectEdges,
  mapEvalReasonToReuseState,
  productionActiveEdgeCount,
  type CompatibilityFactSnapshot,
  type CompatibilityTargetSnapshot,
  type PolicyCompatibilityEdge,
} from "@/lib/policy/compatibilityEdge";
import type { InternalReusableFact } from "./contract";

export { productionActiveEdgeCount };

export type CompatibilityDenial =
  | "incompatible"
  | "expired"
  | "revoked"
  | "sandbox_blocked"
  | "none";

export function packsAreExactMatch(sourcePolicyId: string, targetPolicyId: string): boolean {
  const source = inferPolicyPackFromPolicyId(sourcePolicyId);
  const target = inferPolicyPackFromPolicyId(targetPolicyId);
  if (!source || !target) return false;
  return source.id === target.id;
}

export function factSnapshot(fact: InternalReusableFact): CompatibilityFactSnapshot {
  return {
    pack_id: fact.pack_id,
    policy_version: fact.policy_version,
    minimum_assurance: fact.minimum_assurance,
    method_category: fact.method_category,
    result_category: fact.result_category,
    disclosure_boundary: fact.disclosure_boundary,
    decision_context: fact.decision_context,
    status: fact.status,
    expires_at: fact.expires_at,
  };
}

export function targetSnapshot(input: {
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly: boolean;
}): CompatibilityTargetSnapshot | null {
  const pack = inferPolicyPackFromPolicyId(input.targetPolicyId);
  if (!pack) return null;
  return {
    pack_id: pack.id,
    policy_version: input.targetPolicyVersion,
    required_assurance: pack.minimum_assurance,
    method_category: pack.minimum_assurance,
    result_category: pack.disclosed_result,
    disclosure_boundary: canonicalizeDisclosureBoundary(pack.disclosed_result, pack.partner_does_not_receive),
    sandbox_only: input.targetSandboxOnly || policyPackIsSandboxOnly(pack),
  };
}

export function catalogAllowsReuse(input: {
  sourcePackId: PolicyPackId;
  sourceVersion: number;
  targetPackId: PolicyPackId;
  targetVersion: number;
  registry?: readonly PolicyCompatibilityEdge[];
}): boolean {
  if (input.sourcePackId === input.targetPackId && input.sourceVersion === input.targetVersion) {
    return true;
  }
  return findDirectEdges({
    sourcePackId: input.sourcePackId,
    sourceVersion: input.sourceVersion,
    targetPackId: input.targetPackId,
    targetVersion: input.targetVersion,
    registry: input.registry,
  }).some((edge) => edge.status === "active");
}

export function evaluateFactCompatibility(input: {
  fact: InternalReusableFact;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly: boolean;
  now?: Date;
  registry?: readonly PolicyCompatibilityEdge[];
}): { ok: true } | { ok: false; reason: CompatibilityDenial } {
  const target = targetSnapshot({
    targetPolicyId: input.targetPolicyId,
    targetPolicyVersion: input.targetPolicyVersion,
    targetSandboxOnly: input.targetSandboxOnly,
  });
  if (!target) return { ok: false, reason: "incompatible" };
  const result = evaluateCompatibility({
    fact: factSnapshot(input.fact),
    target,
    now: input.now,
    registry: input.registry,
  });
  if (result.ok) return { ok: true };
  return { ok: false, reason: mapEvalReasonToReuseState(result.reason) };
}

export function targetIsSandboxOnly(policyId: string, continuationSandbox?: boolean): boolean {
  const pack = inferPolicyPackFromPolicyId(policyId);
  if (continuationSandbox === true) return true;
  return Boolean(pack && policyPackIsSandboxOnly(pack));
}
