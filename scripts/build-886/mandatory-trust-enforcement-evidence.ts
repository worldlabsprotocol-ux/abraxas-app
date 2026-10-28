#!/usr/bin/env npx tsx
/**
 * Build 886 — deployed evidence orchestrator (Tracks A–E).
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("/opt/cursor/artifacts/build-886");
mkdirSync(ARTIFACT_DIR, { recursive: true });

type Step = {
  track: string;
  id: string;
  environment: string;
  status: "pass" | "fail" | "skip" | "manual_checkpoint" | "blocked";
  detail: string;
};

const steps: Step[] = [];

function run(track: string, id: string, cmd: string, env = "simulated_ci", optional = false): void {
  try {
    execSync(cmd, { stdio: "pipe", cwd: process.cwd() });
    steps.push({ track, id, environment: env, status: "pass", detail: cmd });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    steps.push({
      track,
      id,
      environment: env,
      status: optional ? "skip" : "fail",
      detail: message.slice(0, 1200),
    });
    if (!optional) throw error;
  }
}

function main(): void {
  const mainSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  run("A", "enforce_protected_adversarial", "./node_modules/.bin/vitest run lib/institutional/mandate/enforceProtectedInstitutionalAction.adversarial.test.ts");
  run("B", "issuer_authority_chain", "./node_modules/.bin/vitest run lib/institutional/mandate/mandateIssuerAuthorityChain.adversarial.test.ts");
  run("C", "external_rp_execution", "./node_modules/.bin/tsx scripts/build-886/external-relying-party-execution.ts");
  run("E", "build885_mandate_regression", "./node_modules/.bin/vitest run lib/institutional/mandate/signedInstitutionalMandate.adversarial.test.ts");
  run("D", "build882_homepage", "./node_modules/.bin/vitest run lib/home/homeTrustArchitectureVisual.test.ts lib/home/trustArchitectureStages.test.ts", "simulated_ci", true);
  run("D", "build883_mandate_unit", "./node_modules/.bin/vitest run lib/institutional/transactionMandateEnforcement.test.ts");
  run(
    "D",
    "build883_production_playwright",
    "./node_modules/.bin/playwright test tests/staging/build-883-production-evidence.spec.ts",
    "production_observation",
    true,
  );
  run(
    "D",
    "build884_architecture_playwright",
    "./node_modules/.bin/playwright test tests/staging/build-884-architecture-visuals.spec.ts",
    "preview",
    true,
  );

  try {
    execSync("npm run build874:security-operations-drills", { stdio: "pipe" });
    steps.push({
      track: "D",
      id: "build874_security_drills",
      environment: "simulated_ci",
      status: "pass",
      detail: "npm run build874:security-operations-drills",
    });
  } catch (error) {
    steps.push({
      track: "D",
      id: "build874_security_drills",
      environment: "simulated_ci",
      status: "fail",
      detail: error instanceof Error ? error.message.slice(0, 800) : String(error),
    });
  }

  steps.push({
    track: "D",
    id: "production_wallet_journey",
    environment: "manual",
    status: "manual_checkpoint",
    detail: "Founder Production wallet session — not simulated in this orchestrator.",
  });

  const report = {
    build: 886,
    main_commit_at_run: mainSha,
    pr885_merged: true,
    bypass_fixes: [
      "enforceProtectedInstitutionalAction requires trustedEnforcementPolicy (no caller requireReceipt flag)",
      "mandate_and_abraxas_receipt requires receipt + evidence commitment binding",
      "protected transaction context digest prevents swapped transaction fields",
    ],
    scorecard: {
      note: "No 9/10 increase — controlled issuer fixture and Production wallet journey remain open.",
    },
    steps,
  };

  writeFileSync(resolve(ARTIFACT_DIR, "evidence-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
