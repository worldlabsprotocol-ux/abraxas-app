#!/usr/bin/env npx tsx
/**
 * Build 878 — unified workspace acceptance artifact (engineering gate; not unaided human adoption).
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifactDir = "/opt/cursor/artifacts";
const artifactPath = resolve(artifactDir, "build-878/unified-workspace-acceptance.json");

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: [err.stdout, err.stderr, err.message].filter(Boolean).join("\n"),
    };
  }
}

const unit877 = run("npm run test:build-877-unified-workspace-continuity");
const unit878 = run("npm run test:build-878-unified-workspace-acceptance");
const enforce870 = run("npm run test:build-870-verifier-enforcement");
const tsc = run("npm run validate:typescript");

const payload = {
  build: 878,
  evidence_class: "automated_acceptance_gate",
  product_experience_score_change: false,
  completed_at: new Date().toISOString(),
  checks: {
    build_877_unit: unit877.ok,
    build_878_unit: unit878.ok,
    build_870_freshness_enforcement: enforce870.ok,
    typescript: tsc.ok,
  },
  notes: [
    "Deployed Playwright and founder walkthrough remain required for completion.",
    "Server guided progress restores wallet proof after refresh; query params do not grant partner admin.",
  ],
  logs: {
    build_877_unit: unit877.output.slice(-2000),
    build_878_unit: unit878.output.slice(-2000),
    build_870: enforce870.output.slice(-1500),
    typescript: tsc.output.slice(-1500),
  },
};

mkdirSync(resolve(artifactDir, "build-878"), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`);

const allOk =
  payload.checks.build_877_unit
  && payload.checks.build_878_unit
  && payload.checks.build_870_freshness_enforcement
  && payload.checks.typescript;

console.log(JSON.stringify({ ok: allOk, artifact: artifactPath, checks: payload.checks }, null, 2));
process.exit(allOk ? 0 : 1);
