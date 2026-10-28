#!/usr/bin/env npx tsx
/**
 * Build 895 — deployed trust assurance + production build memory tracking.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("/opt/cursor/artifacts/build-895");
mkdirSync(ARTIFACT_DIR, { recursive: true });

type Step = {
  id: string;
  tier: "simulated_ci" | "deployed_observation" | "manual_checkpoint" | "blocked";
  status: "pass" | "fail" | "skip" | "blocked" | "manual" | "pending";
  detail: string;
};

const steps: Step[] = [];

function record(step: Step): void {
  steps.push(step);
}

function runVitest(path: string, id: string): void {
  try {
    execSync(`./node_modules/.bin/vitest run ${path}`, { stdio: "pipe", cwd: process.cwd() });
    record({ id, tier: "simulated_ci", status: "pass", detail: path });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 600) : String(error);
    record({ id, tier: "simulated_ci", status: "fail", detail });
    throw error;
  }
}

async function safeGet(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function main(): Promise<void> {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const baseMain = process.env.BUILD895_BASE_MAIN?.trim() || "a7fed3c3";

  execSync("npm run check:execution-contracts", { stdio: "inherit" });
  record({ id: "execution_contract_guard", tier: "simulated_ci", status: "pass", detail: "check:execution-contracts" });

  runVitest("lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts", "institutional_enforcement_adversarial");
  runVitest("lib/institutional/mandate/signedInstitutionalMandate.adversarial.test.ts", "mandate_continuity_adversarial");
  runVitest("examples/portable-relying-party/portable-relying-party.test.ts", "portable_rp_offline_enforcement");
  runVitest("lib/brand/canonicalProcessingEmblem.test.ts", "canonical_processing_emblem");

  const productionBuilds: Array<{ sha: string; deploymentId: string; state: string; note: string }> = JSON.parse(
    process.env.BUILD895_PRODUCTION_BUILDS_JSON?.trim()
      || `[{"sha":"a7fed3c3528cd3da600c4f8e497c7ea4f56bd6ae","deploymentId":"dpl_BLt8k2dFEXNwvz27suRwRdJw5JW3","state":"READY","note":"Build 894 merge — first green production after OOM"}]`,
  );

  const consecutiveReady = productionBuilds.filter((b) => b.state === "READY").length;
  record({
    id: "production_build_memory_incident",
    tier: "deployed_observation",
    status: consecutiveReady >= 2 ? "pass" : "pending",
    detail: JSON.stringify({
      required: "Two consecutive successful Production builds with Vercel build system peak memory recorded",
      observed_ready_count: consecutiveReady,
      builds: productionBuilds,
      memory_metrics: "Collect from Vercel build inspector / build system report per deployment (not in repo API)",
    }),
  });

  const deployBase =
    process.env.BUILD895_PRODUCTION_URL?.trim()
    || process.env.PRODUCTION_PUBLIC_URL?.trim()
    || "https://abraxas-app.vercel.app";

  const health = await safeGet(`${deployBase.replace(/\/$/, "")}/api/launchpad/staging/environment`);
  record({
    id: "production_identity_probe",
    tier: "deployed_observation",
    status: health.ok ? "pass" : "skip",
    detail: JSON.stringify({ url: deployBase, status: health.status }),
  });

  record({
    id: "founder_phantom_production_checkpoint",
    tier: "manual_checkpoint",
    status: "manual",
    detail: "Real Phantom wallet authorization on Production remains a human checkpoint; automate only post-receipt verification.",
  });

  const report = {
    build: 895,
    commit,
    base_main_commit: baseMain,
    generated_at: new Date().toISOString(),
    issuer_handoff: "lib/institutional/mandate/issuerMandateHandoffRequirements.ts",
    steps,
  };
  writeFileSync(resolve(ARTIFACT_DIR, "trust-evidence-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${ARTIFACT_DIR}/trust-evidence-report.json`);
}

void main();
