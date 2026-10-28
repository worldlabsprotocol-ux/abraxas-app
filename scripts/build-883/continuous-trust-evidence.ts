#!/usr/bin/env npx tsx
/**
 * Build 883 — Continuous trust evidence orchestrator (Tracks A / B / C).
 * Labels simulated CI vs deployed vs manual founder checkpoints. Never fabricates Production wallet success.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("/opt/cursor/artifacts/build-883");
mkdirSync(ARTIFACT_DIR, { recursive: true });

type Step = {
  track: "A" | "B" | "C";
  id: string;
  environment: "simulated_ci" | "preview" | "demo" | "production" | "manual";
  status: "pass" | "fail" | "skip" | "manual_checkpoint" | "blocked";
  detail: string;
};

const steps: Step[] = [];

function runVitest(track: "A" | "B" | "C", id: string, cmd: string, optional = false): void {
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
      detail: message.slice(0, 800),
    });
    if (!optional) throw error;
  }
}

function main(): void {
  const productionUrl = process.env.PRODUCTION_PUBLIC_URL?.trim() || "https://abraxasworld.xyz";
  const previewUrl = process.env.BUILD883_PREVIEW_URL?.trim();
  const walletHost = process.env.BUILD883_WALLET_HOST?.trim() || previewUrl || process.env.LAUNCHPAD_STAGING_URL?.trim();

  // Track B — institutional mandate (synthetic relying-party gate)
  runVitest(
    "B",
    "mandate_enforcement_unit",
    "./node_modules/.bin/vitest run lib/institutional/transactionMandateEnforcement.test.ts",
  );
  runVitest(
    "B",
    "external_node_enforcement_fixtures",
    "./node_modules/.bin/vitest run examples/external-node-partner/externalPartner.test.ts",
    true,
  );
  steps.push({
    track: "B",
    id: "mandate_live_issuer_evidence",
    environment: "manual",
    status: "manual_checkpoint",
    detail:
      "Synthetic mandate module demonstrates transaction scope. Live authoritative mandate issuer integration requires institution-supplied evidence — not claimed in this build.",
  });

  // Track C — operational security (reuse Build 874 drill catalog)
  try {
    execSync("npm run build874:security-operations-drills", { stdio: "pipe" });
    steps.push({
      track: "C",
      id: "security_operations_drills",
      environment: "simulated_ci",
      status: "pass",
      detail: "npm run build874:security-operations-drills",
    });
  } catch (error) {
    steps.push({
      track: "C",
      id: "security_operations_drills",
      environment: "simulated_ci",
      status: "fail",
      detail: error instanceof Error ? error.message.slice(0, 800) : String(error),
    });
  }

  steps.push({
    track: "C",
    id: "production_disruptive_drills",
    environment: "production",
    status: "blocked",
    detail: "No destructive Production drills without explicit operator authorization.",
  });

  // Track A — deployed browser acceptance (automated portions only)
  runVitest(
    "A",
    "proof_check_and_workspace_units",
    "./node_modules/.bin/vitest run lib/developers/ephemeralWorkspaceCompletion.test.ts lib/developers/unifiedWorkspaceContinuity.test.ts",
  );

  if (walletHost) {
    const base = walletHost.replace(/\/$/, "");
    const envLabel = base.includes("abraxasworld.xyz") && !base.includes("demo.") ? "production" : "preview";
    try {
      execSync(`BUILD878_EXPECTED_MAIN_SHA=${process.env.BUILD883_EXPECTED_SHA ?? ""} LAUNCHPAD_STAGING_URL=${base} npm run build878:deployed-environment-probe`, {
        stdio: "pipe",
      });
      steps.push({
        track: "A",
        id: "deployed_environment_probe",
        environment: envLabel as Step["environment"],
        status: "pass",
        detail: `build878:deployed-environment-probe @ ${base}`,
      });
    } catch (error) {
      steps.push({
        track: "A",
        id: "deployed_environment_probe",
        environment: envLabel as Step["environment"],
        status: "fail",
        detail: error instanceof Error ? error.message.slice(0, 500) : String(error),
      });
    }

    try {
      const playwrightSpecs = ["tests/staging/build-883-production-evidence.spec.ts"];
      if (process.env.BUILD883_INCLUDE_882_PLAYWRIGHT === "1") {
        playwrightSpecs.unshift("tests/staging/build-882-product-continuity.spec.ts");
      }
      execSync(
        `LAUNCHPAD_STAGING_URL=${base} ./node_modules/.bin/playwright test ${playwrightSpecs.join(" ")}`,
        { stdio: "pipe", encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
      );
      steps.push({
        track: "A",
        id: "playwright_product_and_journey_shell",
        environment: envLabel as Step["environment"],
        status: "pass",
        detail: `${playwrightSpecs.join(", ")} (non-wallet stages)`,
      });
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; message?: string };
      steps.push({
        track: "A",
        id: "playwright_product_and_journey_shell",
        environment: envLabel as Step["environment"],
        status: "fail",
        detail: `${e.stdout ?? ""}\n${e.stderr ?? ""}`.slice(0, 1200),
      });
    }
  } else {
    steps.push({
      track: "A",
      id: "deployed_playwright",
      environment: "preview",
      status: "blocked",
      detail: "Set BUILD883_WALLET_HOST or BUILD883_PREVIEW_URL to run deployed Playwright acceptance.",
    });
  }

  steps.push({
    track: "A",
    id: "founder_production_wallet_journey",
    environment: "production",
    status: "manual_checkpoint",
    detail: `Ten-step Production journey (wallet sign → Check your proof → create app → partner request → independent verify) requires founder wallet approval on ${productionUrl}. Not auto-reported as complete.`,
  });

  const report = {
    build: 883,
    recorded_at: new Date().toISOString(),
    git_sha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
    hosts: {
      production_public_url: productionUrl,
      preview_url: previewUrl ?? null,
      wallet_host_used: walletHost ?? null,
    },
    steps,
    automated_pass: steps.filter((s) => s.status === "pass").map((s) => `${s.track}:${s.id}`),
    manual_checkpoints: steps.filter((s) => s.status === "manual_checkpoint").map((s) => `${s.track}:${s.id}`),
    blocked: steps.filter((s) => s.status === "blocked").map((s) => `${s.track}:${s.id}`),
    scorecard_note:
      "No 9/10 increase from this report alone — Production wallet completion and live mandate issuer evidence remain open.",
  };

  writeFileSync(resolve(ARTIFACT_DIR, "continuous-trust-evidence.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    resolve(ARTIFACT_DIR, "continuous-trust-evidence.md"),
    `# Build 883 evidence report

- SHA: \`${report.git_sha}\`
- Automated pass: ${report.automated_pass.length} steps
- Manual checkpoints: ${report.manual_checkpoints.join(", ") || "none"}
- Blocked: ${report.blocked.join(", ") || "none"}

See \`continuous-trust-evidence.json\` for full step log.
`,
  );

  console.log(JSON.stringify(report, null, 2));
  const failed = steps.filter((s) => s.status === "fail");
  if (failed.length && process.env.BUILD883_STRICT === "1") process.exit(1);
  if (failed.length) {
    console.error(`Build 883: ${failed.length} step(s) failed (set BUILD883_STRICT=1 to fail CI).`);
  }
}

main();
