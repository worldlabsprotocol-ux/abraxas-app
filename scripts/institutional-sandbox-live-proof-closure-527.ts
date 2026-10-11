#!/usr/bin/env npx tsx
/** Build #527 — sanitized closure evidence (no secrets). */

import { writeFileSync, mkdirSync } from "node:fs";
import { buildIntegrationProofPacket } from "@/lib/institutional/sandbox/integrationProofPacket";
import { runLiveSandboxIntegrationTests } from "@/lib/institutional/sandbox/liveSandboxIntegrationRunner";
import { evaluateMigrationRehearsalGate } from "@/lib/institutional/sandbox/migrationRehearsalGate";
import { evaluateSandboxSupabaseTarget } from "@/lib/institutional/sandbox/sandboxProjectAllowlist";
import { buildExternalSandboxProvisioningChecklist } from "@/lib/institutional/sandbox/externalPartnerProvisioningKit";

const OUT = "/opt/cursor/artifacts/institutional-sandbox-live-proof-closure-v527.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const commitSha = process.env.INSTITUTIONAL_BUILD527_COMMIT_SHA?.trim() || "1a510c332145f87447ace5b9d47c2d45eb162ca8";
  const deploymentId = process.env.INSTITUTIONAL_BUILD527_DEPLOYMENT_ID?.trim() || "dpl_6M6aE7otkG2e269qKxTdkfxpXJ3o";
  const previewUrl = process.env.INSTITUTIONAL_SANDBOX_BASE_URL?.trim()
    || "https://abraxas-p75zctf7q-worldlabsprotocol-uxs-projects.vercel.app";

  const packet = await buildIntegrationProofPacket({ baseUrl: previewUrl, commitSha });
  const live = await runLiveSandboxIntegrationTests();
  const migration = evaluateMigrationRehearsalGate({ dryRun: true });
  const target = evaluateSandboxSupabaseTarget();
  const provisioning = buildExternalSandboxProvisioningChecklist();

  const blockers = [
    ...packet.remaining_blockers,
    ...(live.overall !== "PASS" ? live.stages.filter(s => s.verdict !== "PASS").map(s => `live:${s.stage}:${s.verdict}`) : []),
  ];

  let verdict: "PASS" | "FAIL" | "BLOCKED" = "BLOCKED";
  if (packet.preflight.overall === "PASS" && live.overall === "PASS") verdict = "PASS";
  else if (packet.preflight.overall === "FAIL" || live.overall === "FAIL") verdict = "FAIL";

  const report = {
    schema: "institutional_sandbox_live_proof_closure_v527",
    generated_at: new Date().toISOString(),
    commit_sha: commitSha,
    vercel_deployment: {
      id: deploymentId,
      state: process.env.INSTITUTIONAL_BUILD527_VERCEL_STATE?.trim() || "READY",
      preview_url: previewUrl,
      github_commit_sha: commitSha,
      deployment_protection: "active_without_bypass_returns_401",
    },
    sandbox_target: target,
    migration_rehearsal_gate: migration,
    provisioning_checklist_schema: provisioning.schema,
    integration_proof_packet: packet,
    live_integration: live,
    remaining_operator_actions: [
      "Select or provision a dedicated non-production institutional sandbox (do not assume legacy Demo without explicit authorization).",
      "Bind Preview/Custom env on Vercel with SUPABASE_*, ABRAXAS_SIGNING_KEY, NEXTAUTH_SECRET, partner auth, and rate-limit secrets so API routes return JSON (not HTML 500).",
      "Apply migrations 139/140 on authorized sandbox DB via gated apply after backup/PITR ack.",
      "Issue scoped abx_test_* credential + sandbox receipt fixture; set INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED=true and re-run live runner.",
    ],
    blockers,
    verdict,
    onboarding_decision: packet.onboarding_decision,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict, blockers: blockers.length, out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
