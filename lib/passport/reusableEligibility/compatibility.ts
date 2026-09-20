// FILE: lib/passport/reusableEligibility/compatibility.ts
// First-release compatibility is exact pack+version, or an empty reviewed catalog.

import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import type { InternalReusableFact } from "./contract";

/** Reviewed extra edges. First release: none. Never infer age/residency/membership/identity/sandbox/trading/payment. */
export const REVIEWED_REUSE_COMPATIBILITY: ReadonlyArray<{
  from_pack: PolicyPackId;
  from_version: number;
  to_pack: PolicyPackId;
  to_version: number;
}> = [];

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

export function catalogAllowsReuse(input: {
  sourcePackId: PolicyPackId;
  sourceVersion: number;
  targetPackId: PolicyPackId;
  targetVersion: number;
}): boolean {
  if (input.sourcePackId === input.targetPackId && input.sourceVersion === input.targetVersion) {
    return true;
  }
  return REVIEWED_REUSE_COMPATIBILITY.some((edge) =>
    edge.from_pack === input.sourcePackId
    && edge.from_version === input.sourceVersion
    && edge.to_pack === input.targetPackId
    && edge.to_version === input.targetVersion,
  );
}

export function evaluateFactCompatibility(input: {
  fact: InternalReusableFact;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly: boolean;
  now?: Date;
}): { ok: true } | { ok: false; reason: CompatibilityDenial } {
  const now = input.now ?? new Date();
  if (input.fact.status === "revoked") return { ok: false, reason: "revoked" };
  if (input.fact.status === "expired" || (input.fact.expires_at && new Date(input.fact.expires_at) < now)) {
    return { ok: false, reason: "expired" };
  }
  const targetPack = inferPolicyPackFromPolicyId(input.targetPolicyId);
  if (!targetPack) return { ok: false, reason: "incompatible" };
  if (input.fact.decision_context === "sandbox_only" && !input.targetSandboxOnly) {
    return { ok: false, reason: "sandbox_blocked" };
  }
  if (policyPackIsSandboxOnly(targetPack) !== (input.fact.decision_context === "sandbox_only")
    && input.fact.decision_context === "sandbox_only") {
    return { ok: false, reason: "sandbox_blocked" };
  }
  if (!catalogAllowsReuse({
    sourcePackId: input.fact.pack_id as PolicyPackId,
    sourceVersion: input.fact.policy_version,
    targetPackId: targetPack.id,
    targetVersion: input.targetPolicyVersion,
  })) {
    return { ok: false, reason: "incompatible" };
  }
  if (input.targetSandboxOnly && input.fact.decision_context === "production") {
    // Production facts may satisfy a sandbox request of the same pack+version.
  }
  return { ok: true };
}

export function targetIsSandboxOnly(policyId: string, continuationSandbox?: boolean): boolean {
  const pack = inferPolicyPackFromPolicyId(policyId);
  if (continuationSandbox === true) return true;
  return Boolean(pack && policyPackIsSandboxOnly(pack));
}
