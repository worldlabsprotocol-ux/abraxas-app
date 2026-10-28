// FILE: lib/developers/serverAuthoritativeJourney.ts
// Build 889/890 — session-bound journey snapshot (navigation hints only; not authorization).

import { resolveEphemeralSandboxTestPolicy } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";
import type { EphemeralSandboxGuidedProgress } from "@/lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress";
import { sandboxPolicyToStudioPack } from "@/lib/developers/sandboxIntegrationHandoff";

export type ServerAuthoritativeJourneySnapshot = {
  policy_id: string | null;
  /** Studio pack id derived from validated sandbox policy (null when policy unauthorized). */
  studio_pack_id: string | null;
  decision: string | null;
  receipt_id: string | null;
  wallet_proof_validated: boolean;
  workflow_phase: "workspace" | "proof_validated" | "integration_ready";
  /** UI may preselect pack; changing policy requires explicit user action when true. */
  policy_locked: boolean;
  policy_lock_reasons: string[];
};

function receiptValidationAcceptable(progress: EphemeralSandboxGuidedProgress): boolean {
  return progress.receipt_validation?.status === "validated"
    && progress.receipt_validation.currently_acceptable !== false;
}

export function buildServerAuthoritativeJourneySnapshot(input: {
  guidedProgress: EphemeralSandboxGuidedProgress | null;
  workspaceExpiresAt?: string | null;
  now?: Date;
}): ServerAuthoritativeJourneySnapshot | null {
  const progress = input.guidedProgress;
  if (!progress) return null;
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const validated = receiptValidationAcceptable(progress);
  if (!validated) {
    reasons.push("wallet_proof_not_validated");
  }

  const workspaceExpired = Boolean(
    input.workspaceExpiresAt && new Date(input.workspaceExpiresAt) <= now,
  );
  if (workspaceExpired) {
    reasons.push("workspace_expired");
  }

  const policyStillOffered = Boolean(resolveEphemeralSandboxTestPolicy(progress.policy_id));
  if (!policyStillOffered) {
    reasons.push("policy_not_authorized");
  }

  const studioPack = policyStillOffered
    ? sandboxPolicyToStudioPack(progress.policy_id)
    : null;
  if (policyStillOffered && !studioPack) {
    reasons.push("policy_not_mappable_to_studio");
  }

  const policyLocked = validated
    && !workspaceExpired
    && policyStillOffered
    && Boolean(studioPack);

  return {
    policy_id: progress.policy_id ?? null,
    studio_pack_id: studioPack,
    decision: progress.decision ?? null,
    receipt_id: progress.receipt_id ?? null,
    wallet_proof_validated: validated,
    workflow_phase: validated && policyLocked ? "integration_ready" : "proof_validated",
    policy_locked: policyLocked,
    policy_lock_reasons: policyLocked ? [] : reasons,
  };
}
