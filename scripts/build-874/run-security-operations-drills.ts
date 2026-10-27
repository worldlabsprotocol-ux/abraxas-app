#!/usr/bin/env npx tsx
// FILE: scripts/build-874/run-security-operations-drills.ts

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditOperationalSecurityCapabilities,
  BUILD874_ACCEPTANCE_PRIORITY_ORDER,
  summarizeOperationalEvidenceTiers,
} from "../../lib/securityOperations/operationalGapAudit";
import { execFileSync } from "node:child_process";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-874";

const DRILL_SUITES: {
  id: string;
  property: string;
  path: string;
  evidenceTier: "simulated_ci" | "deployed_demo";
}[] = [
  {
    id: "signing_rotation",
    property: "Authorized rotation; reject compromised signer",
    path: "lib/partner/integrationKit/trustContinuity/trustContinuity.adversarial.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "backup_restore",
    property: "Backup restore and digest integrity",
    path: "lib/persistence/boundary/sovereignOperationalProof.integration.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "issuer_freshness",
    property: "Stale issuer → non-authorizing (Build 870)",
    path: "packages/abraxas-independent-verifier/src/issuerFreshnessEnforcement.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "external_rp_adversarial",
    property: "Portable RP verification + adversarial fixtures",
    path: "examples/portable-relying-party/portable-relying-party.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "evidence_dependencies",
    property: "Evidence dependency integrity",
    path: "lib/decisionReceipts/evidenceDependencyIntegrity.adversarial.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "cross_tenant_scope",
    property: "Cross-tenant application denial",
    path: "lib/decisionReceipts/currentValidity/applicationScopeContract.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "replay_wallet_challenge",
    property: "Wallet challenge replay rejection",
    path: "lib/protocolExecution/walletSovereignTrustPath.adversarial.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "revoked_status_replay",
    property: "Stale / revoked status replay rejection",
    path: "examples/integration-first-relying-party/integration-first.test.ts",
    evidenceTier: "simulated_ci",
  },
  {
    id: "external_node_enforce",
    property: "External Node enforce path (statement_stale)",
    path: "examples/external-node-partner/externalPartner.test.ts",
    evidenceTier: "simulated_ci",
  },
];

function runSuite(path: string): { ok: boolean; output: string } {
  try {
    const cmd = path.startsWith("npm run")
      ? path
      : `./node_modules/.bin/vitest run ${path}`;
    const output = execSync(cmd, { cwd: process.cwd(), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: `${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}` };
  }
}

function main(): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const results = DRILL_SUITES.map((suite) => ({ ...suite, ...runSuite(suite.path) }));
  const allOk = results.every((r) => r.ok);
  const capabilities = auditOperationalSecurityCapabilities();
  const priorityGaps = BUILD874_ACCEPTANCE_PRIORITY_ORDER.map((id) => {
    const cap = capabilities.find((c) => c.id === id);
    return cap
      ? {
          id: cap.id,
          acceptancePriority: cap.acceptancePriority,
          evidenceTier: cap.evidenceTier,
          status: cap.status,
          remainingRisk: cap.remainingRisk,
        }
      : { id, missing: true };
  });

  const report = {
    build: 874,
    ok: allOk,
    generated_at: new Date().toISOString(),
    agent_git_sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    drills: results.map((r) => ({
      id: r.id,
      property: r.property,
      path: r.path,
      evidenceTier: r.evidenceTier,
      ok: r.ok,
    })),
    capability_audit: capabilities,
    evidence_tier_summary: summarizeOperationalEvidenceTiers(capabilities),
    acceptance_priority_gaps: priorityGaps,
    deployment_proof: {
      tier: "simulated_ci",
      note: "Drills run local vitest suites only — not a substitute for deployed recovery or third-party assessment.",
    },
    external_assessment_required: true,
    score_claim: "Security remains 6/10 until independent assessment + deployed recovery drills",
  };
  const out = join(ARTIFACT_DIR, "security-operations-drills.json");
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: allOk, artifact: out }, null, 2));
  if (!allOk) process.exit(1);
}

main();
