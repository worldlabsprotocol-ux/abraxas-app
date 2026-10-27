#!/usr/bin/env npx tsx
// FILE: scripts/build-873/live-external-node-adoption.ts
// Track A: live deployed sandbox handoff timing (requires operator env — never fabricates success).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHostedHandoff } from "../../examples/external-node-partner/src/abraxasHttp.js";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-873";

type TimedPhase = { phase: string; ms: number; ok: boolean; detail?: string };

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}

async function main(): Promise<void> {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const started = Date.now();
  const phases: TimedPhase[] = [];

  const report: Record<string, unknown> = {
    build: 873,
    track: "live_external_node_adoption",
    ok: false,
    skipped: false,
    generated_at: new Date().toISOString(),
    phases,
    privileged_interventions: [] as string[],
    note: "",
  };

  if (process.env.BUILD873_LIVE_ADOPTION !== "1") {
    report.skipped = true;
    report.note =
      "Set BUILD873_LIVE_ADOPTION=1 and ABRAXAS_BASE_URL, ABRAXAS_API_KEY, ABRAXAS_APPLICATION_ID to record live timing.";
    writeArtifact(report);
    console.log(JSON.stringify({ skipped: true, artifact: artifactPath() }, null, 2));
    return;
  }

  try {
    const baseUrl = requireEnv("ABRAXAS_BASE_URL");
    const apiKey = requireEnv("ABRAXAS_API_KEY");
    const applicationId = requireEnv("ABRAXAS_APPLICATION_ID");
    const bindingId = process.env.ABRAXAS_BINDING_ID?.trim() || null;

    const t0 = Date.now();
    const handoff = await createHostedHandoff({
      baseUrl,
      apiKey,
      applicationId,
      bindingId,
    });
    phases.push({
      phase: "partner_handoff_create",
      ms: Date.now() - t0,
      ok: handoff.ok,
      detail: handoff.ok ? handoff.verify_request : handoff.error,
    });

    report.ok = handoff.ok;
    if (handoff.ok) {
      report.hosted_url_present = Boolean(handoff.hosted_url);
      report.verify_request_prefix = handoff.verify_request.slice(0, 12);
      report.note =
        "Handoff created. Complete holder flow and portable verify in external-node-partner; receipt timing recorded separately.";
    } else {
      report.note = "Handoff failed — check API key, application id, and sandbox policy binding.";
    }
  } catch (err) {
    report.ok = false;
    report.note = err instanceof Error ? err.message : String(err);
  }

  report.total_ms = Date.now() - started;
  writeArtifact(report);
  console.log(JSON.stringify({ ok: report.ok, artifact: artifactPath(), total_ms: report.total_ms }, null, 2));
  if (!report.ok && !report.skipped) process.exit(1);
}

function artifactPath(): string {
  return join(ARTIFACT_DIR, "live-external-node-adoption.json");
}

function writeArtifact(report: Record<string, unknown>): void {
  writeFileSync(artifactPath(), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

void main();
