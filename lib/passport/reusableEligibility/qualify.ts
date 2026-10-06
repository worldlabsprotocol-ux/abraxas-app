// FILE: lib/passport/reusableEligibility/qualify.ts
// Server-only compatible-fact lookup for the bound continuation.

import { inferPolicyPackFromPolicyId, policyPackIsSandboxOnly } from "@/lib/partner/launchpad/policyPacks";
import type { PolicyCompatibilityEdge } from "@/lib/policy/compatibilityEdge";
import { targetIsSandboxOnly } from "./compatibility";
import { pickBestReuseDecision, type EvidenceReuseDecisionResult } from "./decision";
import { listHolderFacts } from "./store";
import { trustFailureToReuseState } from "./trust";
import { buildReuseClientView } from "./view";
import type { InternalReusableFact } from "./contract";
import type { ReuseClientState, ReuseClientView } from "./contract";

export type CompatibleReusableFactResult =
  | { ok: true; fact: InternalReusableFact; state: "available"; decision: EvidenceReuseDecisionResult }
  | { ok: false; state: ReuseClientState; decision: EvidenceReuseDecisionResult | null };

function targetEnvironment(
  targetPolicyId: string,
  targetSandboxOnly: boolean,
): "sandbox" | "production" {
  if (targetSandboxOnly) return "sandbox";
  const pack = inferPolicyPackFromPolicyId(targetPolicyId);
  if (pack && policyPackIsSandboxOnly(pack)) return "sandbox";
  return "production";
}

export async function resolveCompatibleReusableFact(input: {
  subjectId: string;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly?: boolean;
  relyingPartner?: string;
  registry?: readonly PolicyCompatibilityEdge[];
}): Promise<CompatibleReusableFactResult> {
  try {
    const pack = inferPolicyPackFromPolicyId(input.targetPolicyId);
    if (!pack) return { ok: false, state: "incompatible", decision: null };
    const targetSandbox = targetIsSandboxOnly(
      input.targetPolicyId,
      input.targetSandboxOnly ?? policyPackIsSandboxOnly(pack),
    );
    const facts = await listHolderFacts(input.subjectId);
    if (!facts.length) return { ok: false, state: "none", decision: null };

    const picked = pickBestReuseDecision({
      facts,
      targetPolicyId: input.targetPolicyId,
      targetPolicyVersion: input.targetPolicyVersion,
      targetEnvironment: targetEnvironment(input.targetPolicyId, targetSandbox),
      relyingPartner: input.relyingPartner ?? "unknown",
      targetSandboxOnly: targetSandbox,
      registry: input.registry,
    });

    if (picked?.decision === "reuse") {
      const { fact, ...decision } = picked;
      return { ok: true, fact, state: "available", decision };
    }

    const denial = picked
      ? trustFailureToReuseState(picked.trust)
      : "incompatible";
    const decision = picked
      ? (({ fact: _f, ...rest }) => rest)(picked)
      : null;
    return { ok: false, state: denial, decision };
  } catch {
    return { ok: false, state: "unavailable", decision: null };
  }
}

export async function reuseOptionForContinuation(input: {
  subjectId: string;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly?: boolean;
  relyingPartner?: string;
}): Promise<ReuseClientView> {
  const resolved = await resolveCompatibleReusableFact(input);
  return buildReuseClientView(resolved.ok ? "available" : resolved.state);
}
