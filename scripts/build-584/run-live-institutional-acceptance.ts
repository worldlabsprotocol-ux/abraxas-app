#!/usr/bin/env npx tsx
// FILE: scripts/build-584/run-live-institutional-acceptance.ts

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canonicalProbePasses,
  probeCanonicalDeployment,
} from "@/lib/partner/build584/canonicalDeploymentProbe";
import { runLiveInstitutionalHttpJourney } from "@/lib/partner/build584/liveInstitutionalHttpJourney";
import {
  validateBuild584BrowserArtifact,
  type Build584BrowserAcceptanceArtifact,
} from "@/lib/partner/build584/browserAcceptanceArtifact";

type TierId =
  | "local_automated"
  | "disposable_postgresql"
  | "simulated_sandbox"
  | "real_authenticated_http_sandbox"
  | "authenticated_browser"
  | "canonical_deployed_application"
  | "external_customer_executed"
  | "production_infrastructure_verified"
  | "founder_authorization_required";

type StepResult = { step: string; status: "pass" | "fail" | "blocked" | "skipped"; detail: string };
type TierReport = { tier: TierId; status: "pass" | "fail" | "blocked" | "skipped"; steps: StepResult[] };

function tierStatus(steps: StepResult[]): TierReport["status"] {
  if (steps.some((s) => s.status === "fail")) return "fail";
  if (steps.every((s) => s.status === "skipped")) return "skipped";
  if (steps.some((s) => s.status === "blocked")) return "blocked";
  if (steps.every((s) => s.status === "pass" || s.status === "skipped")) return "pass";
  return "blocked";
}

function runVitestFile(file: string): StepResult {
  try {
    execFileSync(
      join(process.cwd(), "node_modules/.bin/vitest"),
      ["run", "--no-file-parallelism", file],
      { stdio: "pipe", encoding: "utf8" },
    );
    return { step: "vitest", status: "pass", detail: file };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { step: "vitest", status: "fail", detail: message.slice(0, 400) };
  }
}

function loadBuild583Tiers(): TierReport[] {
  const raw = execFileSync("npm", ["run", "-s", "build-583:external-institutional-acceptance"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(raw) as { tiers: Array<{ tier: string; status: string; steps: StepResult[] }> };
  const map583To584 = (id: string): TierId | null => {
    if (id === "local_automated") return "local_automated";
    if (id === "disposable_postgresql") return "disposable_postgresql";
    if (id === "simulated_sandbox_provisioning") return "simulated_sandbox";
    if (id === "real_authenticated_http_sandbox") return "real_authenticated_http_sandbox";
    if (id === "authenticated_browser") return "authenticated_browser";
    if (id === "canonical_deployed_application") return "canonical_deployed_application";
    if (id === "external_customer_executed") return "external_customer_executed";
    if (id === "production_infrastructure_verified") return "production_infrastructure_verified";
    if (id === "founder_authorization_required") return "founder_authorization_required";
    return null;
  };
  return parsed.tiers
    .map((t) => {
      const tier = map583To584(t.tier);
      if (!tier) return null;
      return { tier, status: t.status as TierReport["status"], steps: t.steps };
    })
    .filter((t): t is TierReport => t != null);
}

async function main() {
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const canonicalBase = (process.env.BUILD584_CANONICAL_BASE_URL ?? "https://abraxasworld.xyz").trim();

  const tiers: TierReport[] = [];

  const build583Tiers = loadBuild583Tiers();
  for (const tier of build583Tiers) {
    if (tier.tier === "real_authenticated_http_sandbox" || tier.tier === "canonical_deployed_application") {
      continue;
    }
    if (tier.tier === "local_automated") {
      tier.steps.push({
        step: "local_cryptographic_regression",
        status: runVitestFile("lib/partner/build584/independentVerifierSteps.test.ts").status,
        detail: "Local synthetic harness verifier matrix (not live receipt verification).",
      });
    }
    tiers.push(tier);
  }

  const probe = await probeCanonicalDeployment({ baseUrl: canonicalBase, agentGitSha });
  const canonicalSteps: StepResult[] = [{
    step: "canonical_public_routes",
    status: probe.routes.every((r) => r.reachable) ? "pass" : "fail",
    detail: probe.routes.map((r) => `${r.path}:${r.status}`).join(" · "),
  }, {
    step: "canonical_auth_boundary",
    status: canonicalProbePasses(probe) ? "pass" : "fail",
    detail: `session_get=${probe.session_get_unauthenticated.status} session_post=${probe.session_post_without_key.status} apps=${probe.applications_unauthenticated.status} staging_env=${probe.staging_identity_endpoint.status}`,
  }, {
    step: "deployment_identity",
    status: "skipped",
    detail: probe.deployment_commit_note,
  }];
  tiers.push({
    tier: "canonical_deployed_application",
    status: tierStatus(canonicalSteps),
    steps: canonicalSteps,
  });

  const liveSteps = await runLiveInstitutionalHttpJourney(process.env);
  tiers.push({
    tier: "real_authenticated_http_sandbox",
    status: tierStatus(liveSteps),
    steps: liveSteps,
  });

  const browserArtifacts = [
    join(process.cwd(), "artifacts/build584-authenticated-browser-acceptance.json"),
    join("/opt/cursor/artifacts", "build584-authenticated-browser-acceptance.json"),
    join(process.cwd(), "artifacts/build583-authenticated-browser-acceptance.json"),
  ];
  const browserPath = browserArtifacts.find((p) => existsSync(p));
  const browserSteps: StepResult[] = [];
  let browserArtifact: Build584BrowserAcceptanceArtifact | null = null;
  if (browserPath) {
    try {
      browserArtifact = JSON.parse(readFileSync(browserPath, "utf8")) as Build584BrowserAcceptanceArtifact;
    } catch (error) {
      browserSteps.push({
        step: "browser_acceptance_artifact",
        status: "fail",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const browserValidation = validateBuild584BrowserArtifact(browserArtifact);
  browserSteps.push({
    step: "browser_partner_authentication",
    status: browserValidation.partner_authentication_complete ? "pass" : browserValidation.tier_status === "fail" ? "fail" : "blocked",
    detail: browserArtifact?.stages?.partner_authentication?.detail ?? browserValidation.detail,
  });
  browserSteps.push({
    step: "browser_application_access",
    status: browserValidation.application_access_complete ? "pass" : "blocked",
    detail: browserArtifact?.stages?.application_access?.detail ?? "Not observed.",
  });
  browserSteps.push({
    step: "browser_institutional_configuration",
    status: browserValidation.institutional_configuration_complete ? "pass" : "blocked",
    detail: browserArtifact?.stages?.institutional_configuration?.detail ?? "Not observed.",
  });
  browserSteps.push({
    step: "browser_hosted_holder_authorization",
    status: browserValidation.hosted_holder_authorization_complete ? "pass" : "blocked",
    detail: browserArtifact?.stages?.hosted_holder_authorization?.detail ?? "Not observed.",
  });
  browserSteps.push({
    step: "browser_independent_receipt_verification",
    status: browserValidation.independent_receipt_verification_complete ? "pass" : "blocked",
    detail: browserArtifact?.stages?.independent_receipt_verification?.detail ?? "Not observed.",
  });
  browserSteps.push({
    step: "browser_walkthrough_complete",
    status: browserValidation.walkthrough_complete ? "pass" : browserValidation.tier_status === "fail" ? "fail" : "blocked",
    detail: browserValidation.detail,
  });
  tiers.push({ tier: "authenticated_browser", status: tierStatus(browserSteps), steps: browserSteps });

  if (!tiers.some((t) => t.tier === "external_customer_executed")) {
    tiers.push({
      tier: "external_customer_executed",
      status: "blocked",
      steps: [{
        step: "third_party_integrator",
        status: "blocked",
        detail: "No external institution executed Build #584 outside Abraxas CI.",
      }],
    });
  }
  if (!tiers.some((t) => t.tier === "production_infrastructure_verified")) {
    tiers.push({
      tier: "production_infrastructure_verified",
      status: "skipped",
      steps: [{
        step: "production_ddl",
        status: "skipped",
        detail: "Production DDL and migrations 136-143 remain out of scope.",
      }],
    });
  }
  if (!tiers.some((t) => t.tier === "founder_authorization_required")) {
    tiers.push({
      tier: "founder_authorization_required",
      status: "blocked",
      steps: [{
        step: "production_activation",
        status: "blocked",
        detail: "Production signing and paid IDV require explicit founder authorization.",
      }],
    });
  }

  const completedTiers = tiers.filter((t) => t.status === "pass").map((t) => t.tier);
  const overall = tiers.some((t) => t.status === "fail")
    ? "fail"
    : completedTiers.length > 0
      ? "pass_with_blockers"
      : "blocked";

  console.log(JSON.stringify({
    ok: overall !== "fail",
    build: 584,
    overall,
    agent_git_sha: agentGitSha,
    canonical_base_url: canonicalBase,
    completed_tiers: completedTiers,
    tiers,
    canonical_probe: probe,
  }, null, 2));
  process.exit(overall === "fail" ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
