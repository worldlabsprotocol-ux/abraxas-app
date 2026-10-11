// Sanitized machine-readable integration proof — no secrets or PII.

import { runSandboxActivationPreflight } from "@/lib/institutional/sandbox/sandboxActivationPreflight";
import { evaluateMigrationRehearsalGate } from "@/lib/institutional/sandbox/migrationRehearsalGate";
import { buildExternalSandboxProvisioningChecklist } from "@/lib/institutional/sandbox/externalPartnerProvisioningKit";
import { runLiveSandboxIntegrationTests } from "@/lib/institutional/sandbox/liveSandboxIntegrationRunner";

export type IntegrationProofPacket = {
  schema: "institutional_sandbox_integration_proof_packet_v1";
  generated_at: string;
  environment_id: string | null;
  commit_sha: string | null;
  deployment_sha: string | null;
  contract_version: string;
  preflight: Awaited<ReturnType<typeof runSandboxActivationPreflight>>;
  migration_rehearsal_gate: ReturnType<typeof evaluateMigrationRehearsalGate>;
  provisioning_checklist_schema: string;
  live_integration: Awaited<ReturnType<typeof runLiveSandboxIntegrationTests>>;
  governance_evidence_path: string;
  remaining_blockers: string[];
  onboarding_decision: "ready_for_external_onboarding" | "ready_for_live_sandbox_pilot" | "blocked";
};

export async function buildIntegrationProofPacket(input?: {
  baseUrl?: string;
  commitSha?: string;
}): Promise<IntegrationProofPacket> {
  const preflight = await runSandboxActivationPreflight({ baseUrl: input?.baseUrl });
  const migration_rehearsal_gate = evaluateMigrationRehearsalGate({ dryRun: true });
  const live_integration = await runLiveSandboxIntegrationTests();
  const checklist = buildExternalSandboxProvisioningChecklist();

  const commit_sha = input?.commitSha?.trim()
    || process.env.VERCEL_GIT_COMMIT_SHA?.trim()
    || null;
  const deployment_sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || commit_sha;

  const remaining_blockers: string[] = [];
  for (const c of preflight.checks) {
    if (c.verdict !== "PASS") remaining_blockers.push(`preflight:${c.id}:${c.verdict}`);
  }
  for (const s of live_integration.stages) {
    if (s.verdict !== "PASS") remaining_blockers.push(`live:${s.stage}:${s.verdict}`);
  }
  if (migration_rehearsal_gate.overall !== "PASS") {
    remaining_blockers.push(`migration_gate:${migration_rehearsal_gate.overall}`);
  }
  for (const m of live_integration.missing_dependencies) {
    remaining_blockers.push(`missing:${m}`);
  }

  let onboarding_decision: IntegrationProofPacket["onboarding_decision"] = "blocked";
  const provisioningReady = checklist.steps.length > 0;
  if (
    preflight.overall === "PASS"
    && provisioningReady
    && live_integration.overall === "PASS"
  ) {
    onboarding_decision = "ready_for_live_sandbox_pilot";
  } else if (preflight.overall === "PASS" && provisioningReady) {
    onboarding_decision = "ready_for_external_onboarding";
  }

  return {
    schema: "institutional_sandbox_integration_proof_packet_v1",
    generated_at: new Date().toISOString(),
    environment_id: preflight.environment_id,
    commit_sha,
    deployment_sha,
    contract_version: preflight.contract_version,
    preflight,
    migration_rehearsal_gate,
    provisioning_checklist_schema: checklist.schema,
    live_integration,
    governance_evidence_path: "/opt/cursor/artifacts/institutional-solana-governance-evidence.json",
    remaining_blockers,
    onboarding_decision,
  };
}
