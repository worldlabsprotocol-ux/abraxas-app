// FILE: lib/passport/reusableEligibility/trust.ts
// Canonical reusable evidence trust evaluation. Single server-side gate.

import { assuranceMeetsMinimum } from "@/lib/credentials/assuranceLevels";
import type { PolicyCompatibilityEdge } from "@/lib/policy/compatibilityEdge";
import {
  evaluateFactCompatibility,
  targetIsSandboxOnly,
  targetSnapshot,
} from "./compatibility";
import type { InternalReusableFact } from "./contract";
import { evaluateFactFreshness, type FreshnessState } from "./freshness";

export type CompatibilityState = "exact" | "compatible" | "incompatible";

export interface ReusableEvidenceTrustResult {
  reusable: boolean;
  assurance_sufficient: boolean;
  freshness: FreshnessState;
  compatibility: CompatibilityState;
  source_active: boolean;
  environment_allowed: boolean;
  consent_required: true;
  reasons: string[];
}

export interface EvaluateReusableEvidenceTrustInput {
  fact: InternalReusableFact;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetEnvironment: "sandbox" | "production";
  relyingPartner: string;
  requestContext?: { verifyRequestId?: string };
  targetSandboxOnly?: boolean;
  now?: Date;
  registry?: readonly PolicyCompatibilityEdge[];
}

export function evaluateReusableEvidenceTrust(
  input: EvaluateReusableEvidenceTrustInput,
): ReusableEvidenceTrustResult {
  const reasons: string[] = [];
  const now = input.now ?? new Date();
  const targetSandbox = targetIsSandboxOnly(
    input.targetPolicyId,
    input.targetSandboxOnly ?? (input.targetEnvironment === "sandbox"),
  );
  const target = targetSnapshot({
    targetPolicyId: input.targetPolicyId,
    targetPolicyVersion: input.targetPolicyVersion,
    targetSandboxOnly: targetSandbox,
  });

  const sourceActive = input.fact.status === "active";
  if (!sourceActive) {
    reasons.push(`source_${input.fact.status}`);
  }

  const environmentAllowed = input.targetEnvironment === "sandbox"
    ? true
    : input.fact.decision_context === "production";
  if (!environmentAllowed) {
    reasons.push("environment_blocked");
  }

  const assuranceSufficient = target
    ? assuranceMeetsMinimum(input.fact.minimum_assurance, target.required_assurance)
    : false;
  if (!assuranceSufficient) {
    reasons.push("assurance_insufficient");
  }

  const freshnessEval = evaluateFactFreshness({
    fact: input.fact,
    targetPolicyId: input.targetPolicyId,
    now,
  });
  if (freshnessEval.state !== "fresh" && freshnessEval.reason) {
    reasons.push(freshnessEval.reason);
  }

  const compatibilityCheck = evaluateFactCompatibility({
    fact: input.fact,
    targetPolicyId: input.targetPolicyId,
    targetPolicyVersion: input.targetPolicyVersion,
    targetSandboxOnly: targetSandbox,
    now,
    registry: input.registry,
  });

  let compatibility: CompatibilityState = "incompatible";
  if (compatibilityCheck.ok) {
    const exact = input.fact.pack_id === (target?.pack_id ?? "")
      && input.fact.policy_version === input.targetPolicyVersion;
    compatibility = exact ? "exact" : "compatible";
  } else if (compatibilityCheck.reason !== "none") {
    reasons.push(compatibilityCheck.reason);
  } else {
    reasons.push("incompatible");
  }

  void input.relyingPartner;
  void input.requestContext;

  const reusable = sourceActive
    && environmentAllowed
    && assuranceSufficient
    && freshnessEval.state === "fresh"
    && compatibilityCheck.ok;

  return {
    reusable,
    assurance_sufficient: assuranceSufficient,
    freshness: freshnessEval.state,
    compatibility,
    source_active: sourceActive,
    environment_allowed: environmentAllowed,
    consent_required: true,
    reasons: Array.from(new Set(reasons)),
  };
}

export function trustFailureToReuseState(
  trust: ReusableEvidenceTrustResult,
): "expired" | "revoked" | "incompatible" | "sandbox_blocked" | "none" | "unavailable" {
  if (trust.reasons.includes("revoked") || !trust.source_active && trust.reasons.includes("source_revoked")) {
    return "revoked";
  }
  if (!trust.source_active && trust.reasons.some((r) => r.startsWith("source_"))) {
    if (trust.reasons.includes("source_revoked")) return "revoked";
    if (trust.reasons.includes("source_expired")) return "expired";
  }
  if (trust.freshness === "expired" || trust.reasons.includes("source_expired") || trust.reasons.includes("fact_expired")) {
    return "expired";
  }
  if (trust.freshness === "stale" || trust.reasons.includes("freshness_window_exceeded") || trust.reasons.includes("reuse_not_permitted")) {
    return "expired";
  }
  if (!trust.environment_allowed || trust.reasons.includes("environment_blocked") || trust.reasons.includes("sandbox_blocked")) {
    return "sandbox_blocked";
  }
  if (!trust.reusable) return "incompatible";
  return "none";
}
