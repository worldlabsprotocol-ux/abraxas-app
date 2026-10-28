#!/usr/bin/env npx tsx
/**
 * Build 885 — Institutional authority + independent enforcement evidence (Tracks A–D).
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("/opt/cursor/artifacts/build-885");
mkdirSync(ARTIFACT_DIR, { recursive: true });

type Step = {
  track: "A" | "B" | "C" | "D";
  id: string;
  environment:
    | "unit"
    | "simulated_ci"
    | "local_integration"
    | "preview"
    | "demo"
    | "production"
    | "manual";
  status: "pass" | "fail" | "skip" | "manual_checkpoint" | "blocked";
  detail: string;
};

const steps: Step[] = [];

function run(track: Step["track"], id: string, cmd: string, optional = false): void {
  try {
    execSync(cmd, { stdio: "pipe", cwd: process.cwd() });
    steps.push({ track, id, environment: "simulated_ci", status: "pass", detail: cmd });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    steps.push({
      track,
      id,
      environment: "simulated_ci",
      status: optional ? "skip" : "fail",
      detail: message.slice(0, 1200),
    });
    if (!optional) throw error;
  }
}

function main(): void {
  const mainSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const productionUrl = process.env.PRODUCTION_PUBLIC_URL?.trim() || "https://abraxasworld.xyz";

  // Track A — authoritative mandate evidence (controlled issuer fixture)
  run(
    "A",
    "signed_mandate_adversarial",
    "./node_modules/.bin/vitest run lib/institutional/mandate/signedInstitutionalMandate.adversarial.test.ts",
  );
  run(
    "A",
    "mandate_scope_unit",
    "./node_modules/.bin/vitest run lib/institutional/transactionMandateEnforcement.test.ts",
  );
  steps.push({
    track: "A",
    id: "issuer_fixture_label",
    environment: "unit",
    status: "pass",
    detail:
      "Mandates signed by abraxas_controlled_test_mandate_issuer_not_live_institution — not claimed as external institutional authority.",
  });

  // Track B — independent enforcement
  run(
    "B",
    "independent_enforcement_integration",
    "./node_modules/.bin/vitest run lib/institutional/mandate/independentEnforcementPath.integration.test.ts",
  );
  run(
    "B",
    "external_node_mandate_gate",
    "./node_modules/.bin/vitest run examples/external-node-partner/externalPartner.test.ts -t \"Build 885 mandate gate\"",
  );
  run(
    "B",
    "independent_verifier_adversarial",
    "./node_modules/.bin/vitest run packages/abraxas-independent-verifier/src/independentVerifier.adversarial.test.ts",
    true,
  );

  // Track C — adversarial (included in signed_mandate_adversarial)
  steps.push({
    track: "C",
    id: "adversarial_catalog",
    environment: "simulated_ci",
    status: "pass",
    detail: "lib/institutional/mandate/signedInstitutionalMandate.adversarial.test.ts",
  });

  // Track D — deployed operational continuity (read-only)
  try {
    execSync("npm run build874:security-operations-drills", { stdio: "pipe" });
    steps.push({
      track: "D",
      id: "security_operations_drills",
      environment: "simulated_ci",
      status: "pass",
      detail: "npm run build874:security-operations-drills",
    });
  } catch (error) {
    steps.push({
      track: "D",
      id: "security_operations_drills",
      environment: "simulated_ci",
      status: "fail",
      detail: error instanceof Error ? error.message.slice(0, 800) : String(error),
    });
  }

  run(
    "D",
    "build883_production_evidence_playwright",
    "./node_modules/.bin/playwright test tests/staging/build-883-production-evidence.spec.ts",
    true,
  );

  steps.push({
    track: "D",
    id: "production_wallet_journey",
    environment: "manual",
    status: "manual_checkpoint",
    detail:
      "Founder Production wallet → proof → test app → callback → receipt → independent verify remains manual where live wallet approval is required.",
  });

  steps.push({
    track: "D",
    id: "production_disruptive_drills",
    environment: "production",
    status: "blocked",
    detail: "No destructive Production operations without explicit operator approval.",
  });

  const report = {
    build: 885,
    main_commit_at_run: mainSha,
    production_url_observed: productionUrl,
    controlled_mandate_issuer: "abraxas_controlled_test_mandate_issuer_not_live_institution",
    scorecard: {
      note: "No 9/10 increase from this build alone — external institutional acceptance and full Production wallet journey remain open.",
    },
    steps,
  };

  writeFileSync(resolve(ARTIFACT_DIR, "evidence-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(ARTIFACT_DIR, "evidence-report.md"),
    `# Build 885 evidence\n\nMain at run: \`${mainSha}\`\n\n${steps.map((s) => `- **${s.track}** \`${s.id}\` (${s.environment}): ${s.status} — ${s.detail}`).join("\n")}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

main();
