// FILE: lib/passport/reusableEligibility/qualify.ts
// Server-only compatible-fact lookup for the bound continuation.

import { inferPolicyPackFromPolicyId, policyPackIsSandboxOnly } from "@/lib/partner/launchpad/policyPacks";
import { evaluateFactCompatibility, targetIsSandboxOnly } from "./compatibility";
import { listHolderFacts } from "./store";
import { buildReuseClientView } from "./view";
import type { InternalReusableFact } from "./contract";
import type { ReuseClientState, ReuseClientView } from "./contract";

export async function resolveCompatibleReusableFact(input: {
  subjectId: string;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly?: boolean;
}): Promise<
  | { ok: true; fact: InternalReusableFact; state: "available" }
  | { ok: false; state: ReuseClientState }
> {
  try {
    const pack = inferPolicyPackFromPolicyId(input.targetPolicyId);
    if (!pack) return { ok: false, state: "incompatible" };
    const targetSandbox = targetIsSandboxOnly(
      input.targetPolicyId,
      input.targetSandboxOnly ?? policyPackIsSandboxOnly(pack),
    );
    const facts = await listHolderFacts(input.subjectId);
    if (!facts.length) return { ok: false, state: "none" };

    let denial: ReuseClientState = "incompatible";
    for (const fact of facts) {
      const check = evaluateFactCompatibility({
        fact,
        targetPolicyId: input.targetPolicyId,
        targetPolicyVersion: input.targetPolicyVersion,
        targetSandboxOnly: targetSandbox,
      });
      if (check.ok && fact.status === "active") {
        return { ok: true, fact, state: "available" };
      }
      if (!check.ok) denial = check.reason;
    }
    return { ok: false, state: denial };
  } catch {
    return { ok: false, state: "unavailable" };
  }
}

export async function reuseOptionForContinuation(input: {
  subjectId: string;
  targetPolicyId: string;
  targetPolicyVersion: number;
  targetSandboxOnly?: boolean;
}): Promise<ReuseClientView> {
  const resolved = await resolveCompatibleReusableFact(input);
  return buildReuseClientView(resolved.ok ? "available" : resolved.state);
}
