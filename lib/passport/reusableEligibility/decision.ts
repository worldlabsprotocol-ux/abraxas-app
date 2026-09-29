// FILE: lib/passport/reusableEligibility/decision.ts
// Explicit reuse / refresh / not-compatible decision for holder flows.

import type { PolicyCompatibilityEdge } from "@/lib/policy/compatibilityEdge";
import type { InternalReusableFact } from "./contract";
import type { FreshnessState } from "./freshness";
import {
  evaluateReusableEvidenceTrust,
  type EvaluateReusableEvidenceTrustInput,
  type ReusableEvidenceTrustResult,
} from "./trust";

export type EvidenceReuseDecision = "reuse" | "refresh_required" | "not_compatible";

export interface EvidenceReuseDecisionResult {
  decision: EvidenceReuseDecision;
  reason: string;
  assurance_level: string;
  freshness_state: FreshnessState;
  trust: ReusableEvidenceTrustResult;
}

export function decideEvidenceReuse(
  input: EvaluateReusableEvidenceTrustInput & { fact: InternalReusableFact },
): EvidenceReuseDecisionResult {
  const trust = evaluateReusableEvidenceTrust(input);

  if (trust.reusable) {
    return {
      decision: "reuse",
      reason: "trust_satisfied",
      assurance_level: input.fact.minimum_assurance,
      freshness_state: trust.freshness,
      trust,
    };
  }

  if (
    trust.freshness === "stale"
    || trust.freshness === "expired"
    || trust.reasons.includes("freshness_window_exceeded")
    || trust.reasons.includes("reuse_not_permitted")
    || trust.reasons.includes("source_expired")
    || trust.reasons.includes("fact_expired")
    || (!trust.source_active && trust.reasons.some((r) => r.startsWith("source_")))
  ) {
    return {
      decision: "refresh_required",
      reason: trust.reasons[0] ?? "refresh_required",
      assurance_level: input.fact.minimum_assurance,
      freshness_state: trust.freshness,
      trust,
    };
  }

  return {
    decision: "not_compatible",
    reason: trust.reasons[0] ?? "not_compatible",
    assurance_level: input.fact.minimum_assurance,
    freshness_state: trust.freshness,
    trust,
  };
}

export function pickBestReuseDecision(input: {
  facts: InternalReusableFact[];
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetEnvironment: "sandbox" | "production";
  relyingPartner: string;
  targetSandboxOnly?: boolean;
  now?: Date;
  registry?: readonly PolicyCompatibilityEdge[];
}): (EvidenceReuseDecisionResult & { fact: InternalReusableFact }) | null {
  let best: (EvidenceReuseDecisionResult & { fact: InternalReusableFact }) | null = null;
  for (const fact of input.facts) {
    const decision = decideEvidenceReuse({
      fact,
      targetPolicyId: input.targetPolicyId,
      targetPolicyVersion: input.targetPolicyVersion,
      targetEnvironment: input.targetEnvironment,
      relyingPartner: input.relyingPartner,
      targetSandboxOnly: input.targetSandboxOnly,
      now: input.now,
      registry: input.registry,
    });
    const withFact = { ...decision, fact };
    if (decision.decision === "reuse") return withFact;
    if (!best) best = withFact;
    else if (decision.decision === "refresh_required" && best.decision === "not_compatible") {
      best = withFact;
    }
  }
  return best;
}
