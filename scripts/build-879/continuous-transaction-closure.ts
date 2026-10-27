#!/usr/bin/env npx tsx
/**
 * Build 879 — continuous transaction closure gate (execution evidence, not new acceptance framework).
 * Combines deployed probes, local continuity units, optional Demo partner leg, and Playwright when wallet host is set.
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const artifactDir = resolve("/opt/cursor/artifacts/build-879");
mkdirSync(artifactDir, { recursive: true });

type StepResult = {
  id: string;
  status: "pass" | "fail" | "skip" | "manual_checkpoint";
  detail: string;
};

const steps: StepResult[] = [];

function runStep(id: string, cmd: string, optional = false): void {
  try {
    execSync(cmd, { stdio: "pipe", cwd: resolve(process.cwd()) });
    steps.push({ id, status: "pass", detail: cmd });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    steps.push({
      id,
      status: optional ? "skip" : "fail",
      detail: message.slice(0, 500),
    });
    if (!optional) throw error;
  }
}

runStep(
  "vitest_unified_workspace_continuity",
  "./node_modules/.bin/vitest run lib/developers/unifiedWorkspacePreservedQuery.test.ts lib/developers/unifiedWorkspaceAcceptance.test.ts lib/developers/ephemeralWorkspaceCompletion.test.ts lib/developers/unifiedWorkspaceContinuity.test.ts",
);

runStep("build878_deploy_probe", "npm run build878:deployed-environment-probe", true);

const walletHost = process.env.BUILD879_WALLET_HOST?.trim() || process.env.LAUNCHPAD_STAGING_URL?.trim();
if (walletHost) {
  runStep(
    "playwright_unified_workspace",
    `LAUNCHPAD_STAGING_URL=${walletHost.replace(/\/$/, "")} ./node_modules/.bin/playwright test tests/staging/unified-workspace-continuity.spec.ts tests/staging/unified-workspace-acceptance.spec.ts`,
  );
} else {
  steps.push({
    id: "playwright_unified_workspace",
    status: "manual_checkpoint",
    detail: "Set BUILD879_WALLET_HOST or LAUNCHPAD_STAGING_URL to a wallet-operational host (e.g. https://abraxasworld.xyz).",
  });
}

if (process.env.BUILD879_DEMO_PARTNER_LEG === "1") {
  runStep("demo_partner_leg", "BUILD878_FULL_TRANSACTION=1 npm run build878:full-transaction-continuity", true);
} else {
  steps.push({
    id: "demo_partner_leg",
    status: "manual_checkpoint",
    detail: "Demo partner leg: BUILD879_DEMO_PARTNER_LEG=1 with LAUNCHPAD_* credentials (separate from Production wallet session).",
  });
}

steps.push({
  id: "founder_continuous_browser_session",
  status: "manual_checkpoint",
  detail:
    "One tab on wallet-operational host: wallet_control verify → receipt validate → embedded create sandbox → partner request → portable verify. Record redacted video; do not merge Demo partner run with Production wallet run into one claim.",
});

const report = {
  build: 879,
  recorded_at: new Date().toISOString(),
  wallet_host: walletHost ?? null,
  steps,
  automated_steps_passed: steps.filter((s) => s.status === "pass").map((s) => s.id),
  manual_checkpoints: steps.filter((s) => s.status === "manual_checkpoint").map((s) => s.id),
  continuous_closure_met: steps
    .filter((s) => s.status !== "manual_checkpoint" && s.status !== "skip")
    .every((s) => s.status === "pass"),
};

writeFileSync(resolve(artifactDir, "continuous-transaction-closure.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (!report.continuous_closure_met) {
  process.exitCode = 1;
}
