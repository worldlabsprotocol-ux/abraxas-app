#!/usr/bin/env npx tsx
// FILE: scripts/build-583/run-external-institutional-acceptance.ts
// External institutional sandbox acceptance harness (Build #583).

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { evaluateBuild582DisposableTrustProofBootstrap } from "@/lib/passport/build582/disposableTrustProofDatabase";

type TierId =
  | "local_automated"
  | "disposable_postgresql"
  | "customer_facing_sandbox"
  | "authenticated_browser"
  | "canonical_deployed_application"
  | "external_customer_executed"
  | "production_infrastructure_verified"
  | "founder_authorization_required";

type StepResult = {
  step: string;
  status: "pass" | "fail" | "blocked" | "skipped";
  detail: string;
};

type TierReport = {
  tier: TierId;
  status: "pass" | "fail" | "blocked" | "skipped";
  steps: StepResult[];
};

function runVitest(files: string[]): StepResult {
  try {
    execFileSync(
      join(process.cwd(), "node_modules/.bin/vitest"),
      ["run", "--no-file-parallelism", ...files],
      { stdio: "pipe", encoding: "utf8" },
    );
    return { step: "vitest", status: "pass", detail: files.join(", ") };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { step: "vitest", status: "fail", detail: message.slice(0, 500) };
  }
}

async function main() {
  const tiers: TierReport[] = [];

  const localSteps: StepResult[] = [];
  localSteps.push(runVitest([
    "lib/partner/build583.institutionalActivationMilestones.test.ts",
    "lib/partner/build583.externalInstitutionalAcceptance.test.ts",
    "lib/partner/build582.institutionalPartnerSandboxJourney.test.ts",
  ]));
  tiers.push({
    tier: "local_automated",
    status: localSteps.every((s) => s.status === "pass") ? "pass" : "fail",
    steps: localSteps,
  });

  const disposableBootstrap = evaluateBuild582DisposableTrustProofBootstrap(process.env);
  const disposableSteps: StepResult[] = [];
  if (!disposableBootstrap.ok) {
    disposableSteps.push({
      step: "disposable_guard",
      status: "blocked",
      detail: disposableBootstrap.reason,
    });
  } else {
    try {
      execFileSync("npm", ["run", "-s", "build-582:institutional-trust-proof"], {
        stdio: "pipe",
        encoding: "utf8",
      });
      disposableSteps.push({
        step: "build-582_institutional_trust_proof",
        status: "pass",
        detail: `database_identity=${disposableBootstrap.databaseIdentity}`,
      });
    } catch (error) {
      disposableSteps.push({
        step: "build-582_institutional_trust_proof",
        status: "fail",
        detail: error instanceof Error ? error.message.slice(0, 400) : String(error),
      });
    }
  }
  tiers.push({
    tier: "disposable_postgresql",
    status: disposableSteps.some((s) => s.status === "fail")
      ? "fail"
      : disposableSteps.some((s) => s.status === "blocked")
        ? "blocked"
        : "pass",
    steps: disposableSteps,
  });

  const sandboxSteps: StepResult[] = [];
  sandboxSteps.push(runVitest(["lib/partner/build583.externalInstitutionalAcceptance.test.ts"]));
  tiers.push({
    tier: "customer_facing_sandbox",
    status: sandboxSteps.every((s) => s.status === "pass") ? "pass" : "fail",
    steps: sandboxSteps,
  });

  tiers.push({
    tier: "authenticated_browser",
    status: "blocked",
    steps: [{
      step: "launchpad_walkthrough",
      status: "blocked",
      detail: process.env.BUILD583_BROWSER_ACCEPTANCE_COMPLETE === "1"
        ? "Marked complete by operator."
        : "Requires partner Google session on /developers/launchpad. Run computer acceptance or set BUILD583_BROWSER_ACCEPTANCE_COMPLETE=1 after manual walkthrough.",
    }],
  });

  tiers.push({
    tier: "canonical_deployed_application",
    status: process.env.BUILD583_CANONICAL_URL ? "blocked" : "skipped",
    steps: [{
      step: "abraxasworld_xyz",
      status: process.env.BUILD583_CANONICAL_URL ? "blocked" : "skipped",
      detail: process.env.BUILD583_CANONICAL_URL
        ? `Set BUILD583_CANONICAL_URL=${process.env.BUILD583_CANONICAL_URL} and run staging smoke separately.`
        : "Not executed in local agent environment.",
    }],
  });

  tiers.push({
    tier: "external_customer_executed",
    status: "blocked",
    steps: [{
      step: "third_party_integrator",
      status: "blocked",
      detail: "No external institution executed this harness outside Abraxas CI. Use docs/partner-handoff/institutional-sandbox-activation-583.md on customer infra.",
    }],
  });

  tiers.push({
    tier: "production_infrastructure_verified",
    status: "skipped",
    steps: [{
      step: "production_ddl",
      status: "skipped",
      detail: "Production DDL and migrations 136-143 intentionally not run (Build #579-582 boundary).",
    }],
  });

  tiers.push({
    tier: "founder_authorization_required",
    status: "blocked",
    steps: [{
      step: "production_activation",
      status: "blocked",
      detail: "Production signing, paid IDV, and Production migration apply require explicit founder authorization.",
    }],
  });

  const overall = tiers.some((t) => t.status === "fail")
    ? "fail"
    : tiers.filter((t) => t.status === "pass").length >= 2
      ? "pass_with_blockers"
      : "blocked";

  console.log(JSON.stringify({ ok: overall !== "fail", build: 583, overall, tiers }, null, 2));
  process.exit(overall === "fail" ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
