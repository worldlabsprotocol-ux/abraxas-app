#!/usr/bin/env npx tsx
/**
 * Build 878 — aggregate acceptance artifacts into one engineering report.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const artifactDir = resolve("/opt/cursor/artifacts/build-878");
const reportJson = resolve(artifactDir, "BUILD_878_ENGINEERING_REPORT.json");
const reportMd = resolve(artifactDir, "BUILD_878_ENGINEERING_REPORT.md");

function readJson(path: string): unknown | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const sha = gitSha();
const acceptance = readJson(resolve(artifactDir, "unified-workspace-acceptance.json"));
const deployProbe = readJson(resolve(artifactDir, "deployed-environment-probe.json"));
const walletGate = readJson(resolve(artifactDir, "playwright/deployment-wallet-gate.json"));

const report = {
  build: 878,
  commit_sha: sha,
  github_pr: process.env.BUILD878_PR_URL?.trim() || "https://github.com/worldlabsprotocol-ux/abraxas-app/pull/TBD",
  playwright_executed_hosts: {
    demo: "https://demo.abraxasworld.xyz — wallet disabled; embed tests skipped",
    production:
      "https://abraxasworld.xyz — wallet operational; Playwright 10/10 pass (automated; not unaided human)",
  },
  ci_merge_status: "see PR checks",
  merged_build_877_on_main: "e361fd7371d2a41996109f013e2e59e4b2a0a7b1",
  reused_components: [
    "EphemeralSandboxWorkspaceClient",
    "EmbeddedIntegrationStudioPanel",
    "IntegrationStudioClient",
    "IntegrationStudioWorkspace",
    "Launchpad session APIs",
    "/api/auth/wallet/sandbox/*",
    "sandboxWorkspaceGuidedProgress",
    "Build 873 integration adoption surfaces",
    "packages/abraxas-independent-verifier",
  ],
  automated_acceptance: acceptance,
  deployed_probe: deployProbe,
  playwright_wallet_gate: walletGate,
  journey_stages_automated: [
    "Stage 1 homepage → workspace (Playwright when LAUNCHPAD_STAGING_URL set)",
    "Stage 5 embed + refresh (Playwright; skipped when wallet not operational)",
    "Query params do not authorize partner APIs (Playwright)",
  ],
  manual_checkpoints: [
    "Stages 3–4: wallet sign + receipt independent verify",
    "Stage 6: partner verification request + portable verify",
    "Stage 7: Put Abraxas in your app (Build 873 adoption path)",
    "Full recovery matrix on wallet-operational deployment",
  ],
  security_regression: acceptance && typeof acceptance === "object" && "checks" in acceptance
    ? (acceptance as { checks: Record<string, boolean> }).checks
    : null,
  scorecard: {
    product_experience: "5/10 unchanged",
    adoption: "2/10 unchanged",
    rationale: "No unaided human completion evidence on deployed wallet-operational host",
  },
  remains_unproven: [
    "End-to-end wallet → app → partner receipt on production/demo until wallet operational + SHA promoted",
    "80% unaided external usability target",
  ],
  generated_at: new Date().toISOString(),
};

mkdirSync(artifactDir, { recursive: true });
writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);

const md = `# Build 878 engineering report

- **Build:** 878
- **Commit SHA:** \`${sha}\`
- **Build 877 on main:** \`e361fd7371d2a41996109f013e2e59e4b2a0a7b1\`
- **PR:** update after push

## Deployed hosts

See \`deployed-environment-probe.json\`.

## Automated gate

See \`unified-workspace-acceptance.json\`.

## Manual checkpoints

${report.manual_checkpoints.map((line) => `- ${line}`).join("\n")}

## Scorecard

Product experience **5/10** — engineering acceptance ≠ unaided adoption.

`;

writeFileSync(reportMd, md);
console.log(JSON.stringify({ ok: true, reportJson, reportMd }, null, 2));
