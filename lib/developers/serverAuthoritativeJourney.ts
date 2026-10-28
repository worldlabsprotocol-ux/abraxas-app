// FILE: lib/developers/serverAuthoritativeJourney.ts
// Build 889 — session-bound journey snapshot (navigation hints only; not authorization).

import type { EphemeralSandboxGuidedProgress } from "@/lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress";

export type ServerAuthoritativeJourneySnapshot = {
  policy_id: string | null;
  decision: string | null;
  receipt_id: string | null;
  wallet_proof_validated: boolean;
  workflow_phase: "workspace" | "proof_validated" | "integration_ready";
  /** UI may preselect pack; changing policy requires explicit user action. */
  policy_locked: boolean;
};

export function buildServerAuthoritativeJourneySnapshot(input: {
  guidedProgress: EphemeralSandboxGuidedProgress | null;
}): ServerAuthoritativeJourneySnapshot | null {
  const progress = input.guidedProgress;
  if (!progress) return null;
  const validated = progress.receipt_validation?.status === "validated"
    && progress.receipt_validation.currently_acceptable !== false;
  return {
    policy_id: progress.policy_id ?? null,
    decision: progress.decision ?? null,
    receipt_id: progress.receipt_id ?? null,
    wallet_proof_validated: validated,
    workflow_phase: validated ? "integration_ready" : "proof_validated",
    policy_locked: Boolean(progress.policy_id && validated),
  };
}
