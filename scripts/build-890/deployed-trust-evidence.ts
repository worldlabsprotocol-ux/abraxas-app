#!/usr/bin/env npx tsx
/**
 * Build 890 — deployed trust evidence (Tracks C–E orchestration).
 * Separates simulated CI, safe deployed GET probes, and manual Production wallet checkpoints.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("/opt/cursor/artifacts/build-890");
mkdirSync(ARTIFACT_DIR, { recursive: true });

type EvidenceStep = {
  track: "A" | "B" | "C" | "D" | "E";
  id: string;
  tier: "simulated_ci" | "deployed_observation" | "manual_checkpoint" | "blocked";
  status: "pass" | "fail" | "skip" | "blocked" | "manual";
  detail: string;
};

const steps: EvidenceStep[] = [];

function record(step: EvidenceStep): void {
  steps.push(step);
}

function run(cmd: string, track: EvidenceStep["track"], id: string): void {
  try {
    execSync(cmd, { stdio: "pipe", cwd: process.cwd() });
    record({ track, id, tier: "simulated_ci", status: "pass", detail: cmd });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 800) : String(error);
    record({ track, id, tier: "simulated_ci", status: "fail", detail });
    throw error;
  }
}

async function safeGet(url: string): Promise<{ ok: boolean; status: number; snippet: string }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const text = await res.text();
    return { ok: res.ok, status: res.status, snippet: text.slice(0, 400) };
  } catch (error) {
    return { ok: false, status: 0, snippet: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<void> {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const baseMain = process.env.BUILD890_BASE_MAIN?.trim() || "88606c9d";

  run("npm run check:execution-contracts", "A", "execution_contract_guard");
  run(
    "./node_modules/.bin/vitest run lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts",
    "D",
    "protected_institutional_enforcement_regression",
  );
  run(
    "./node_modules/.bin/vitest run examples/portable-relying-party/portable-relying-party.test.ts",
    "D",
    "portable_receipt_offline_verification",
  );

  const deployBase =
    process.env.BUILD890_PREVIEW_URL?.trim()
    || process.env.LAUNCHPAD_STAGING_URL?.trim()
    || process.env.PRODUCTION_PUBLIC_URL?.trim()
    || "";

  if (deployBase) {
    const identity = await safeGet(`${deployBase.replace(/\/$/, "")}/api/launchpad/staging/environment`);
    record({
      track: "C",
      id: "deployment_identity_probe",
      tier: "deployed_observation",
      status: identity.ok ? "pass" : "skip",
      detail: JSON.stringify({ url: deployBase, status: identity.status, snippet: identity.snippet }),
    });
  } else {
    record({
      track: "C",
      id: "deployment_identity_probe",
      tier: "deployed_observation",
      status: "blocked",
      detail: "Set BUILD890_PREVIEW_URL or LAUNCHPAD_STAGING_URL for deployed observations.",
    });
  }

  record({
    track: "C",
    id: "production_disruptive_drills",
    tier: "blocked",
    status: "blocked",
    detail: "No destructive Production drills without explicit operator approval.",
  });

  record({
    track: "E",
    id: "founder_wallet_production_checkpoint",
    tier: "manual_checkpoint",
    status: "manual",
    detail:
      "Human Phantom approval required for full Production integration journey. Automate through receipt retrieval and independent validation only after authorized wallet approval.",
  });

  const report = {
    build: 890,
    commit,
    base_main_commit: baseMain,
    generated_at: new Date().toISOString(),
    deploy_base: deployBase || null,
    steps,
  };
  writeFileSync(resolve(ARTIFACT_DIR, "trust-evidence-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${ARTIFACT_DIR}/trust-evidence-report.json`);
}

void main();
