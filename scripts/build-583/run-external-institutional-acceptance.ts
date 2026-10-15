#!/usr/bin/env npx tsx
// FILE: scripts/build-583/run-external-institutional-acceptance.ts
// External institutional sandbox acceptance harness (Build #583).

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { evaluateBuild582DisposableTrustProofBootstrap } from "@/lib/passport/build582/disposableTrustProofDatabase";

type TierId =
  | "local_automated"
  | "simulated_sandbox_provisioning"
  | "disposable_postgresql"
  | "real_authenticated_http_sandbox"
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

const BROWSER_ARTIFACT = join(process.cwd(), "artifacts/build583-authenticated-browser-acceptance.json");

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

function tierStatus(steps: StepResult[]): TierReport["status"] {
  if (steps.some((s) => s.status === "fail")) return "fail";
  if (steps.every((s) => s.status === "skipped")) return "skipped";
  if (steps.some((s) => s.status === "blocked")) return "blocked";
  if (steps.every((s) => s.status === "pass")) return "pass";
  return "blocked";
}

async function runRealAuthenticatedHttpSandbox(): Promise<StepResult[]> {
  const base = process.env.BUILD583_SANDBOX_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.BUILD583_PARTNER_API_KEY?.trim();
  const applicationId = process.env.BUILD583_APPLICATION_ID?.trim();

  if (!base || !apiKey) {
    return [{
      step: "http_sandbox_prerequisites",
      status: "blocked",
      detail:
        "Set BUILD583_SANDBOX_BASE_URL and BUILD583_PARTNER_API_KEY to execute real authenticated HTTP sandbox acceptance.",
    }];
  }

  const steps: StepResult[] = [];
  try {
    const authRes = await fetch(`${base}/api/launchpad/auth/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const authBody = await authRes.json().catch(() => ({}));
    if (!authRes.ok) {
      steps.push({
        step: "partner_session_post",
        status: "fail",
        detail: `HTTP ${authRes.status}: ${JSON.stringify(authBody).slice(0, 200)}`,
      });
      return steps;
    }
    const setCookie = authRes.headers.get("set-cookie") ?? "";
    if (!setCookie.includes("abraxas_partner_console_session")) {
      steps.push({
        step: "partner_session_cookie",
        status: "fail",
        detail: "Session POST succeeded but partner console cookie was not issued.",
      });
      return steps;
    }
    steps.push({ step: "partner_session_post", status: "pass", detail: "Sandbox API key accepted." });

    if (!applicationId) {
      steps.push({
        step: "integration_health_get",
        status: "blocked",
        detail: "Set BUILD583_APPLICATION_ID to fetch institutional integration-health over HTTP.",
      });
      return steps;
    }

    const healthRes = await fetch(`${base}/api/launchpad/applications/${applicationId}/integration-health`, {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
      cache: "no-store",
    });
    const healthBody = await healthRes.json().catch(() => ({}));
    if (!healthRes.ok) {
      steps.push({
        step: "integration_health_get",
        status: "fail",
        detail: `HTTP ${healthRes.status}: ${JSON.stringify(healthBody).slice(0, 200)}`,
      });
      return steps;
    }
    const hasActivation = Boolean(
      healthBody
      && typeof healthBody === "object"
      && (healthBody as { institutional_activation?: unknown }).institutional_activation,
    );
    steps.push({
      step: "integration_health_get",
      status: hasActivation ? "pass" : "fail",
      detail: hasActivation
        ? "Institutional activation evidence returned over authenticated HTTP."
        : "Missing institutional_activation payload.",
    });
  } catch (error) {
    steps.push({
      step: "http_sandbox_execution",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  return steps;
}

function runAuthenticatedBrowserTier(): StepResult[] {
  const artifactPaths = [
    BROWSER_ARTIFACT,
    join("/opt/cursor/artifacts", "build583-authenticated-browser-acceptance.json"),
  ];
  const path = artifactPaths.find((candidate) => existsSync(candidate));
  if (!path) {
    return [{
      step: "browser_acceptance_artifact",
      status: "blocked",
      detail:
        "No authenticated browser artifact found. Complete a Launchpad walkthrough and write artifacts/build583-authenticated-browser-acceptance.json with routes tested and session outcome.",
    }];
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      ok?: boolean;
      routes_tested?: string[];
      partner_session?: string;
      recorded_at?: string;
    };
    if (parsed.ok !== true || !Array.isArray(parsed.routes_tested) || parsed.routes_tested.length === 0) {
      return [{
        step: "browser_acceptance_artifact",
        status: "fail",
        detail: "Artifact present but invalid. Require ok:true and routes_tested[].",
      }];
    }
    return [{
      step: "browser_acceptance_artifact",
      status: "pass",
      detail: `Recorded ${parsed.recorded_at ?? "unknown time"} · routes=${parsed.routes_tested.join(", ")} · session=${parsed.partner_session ?? "unknown"}`,
    }];
  } catch (error) {
    return [{
      step: "browser_acceptance_artifact",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    }];
  }
}

async function main() {
  const tiers: TierReport[] = [];

  const localSteps: StepResult[] = [];
  localSteps.push(runVitest([
    "lib/partner/build583.localAutomated.test.ts",
    "lib/partner/build583.institutionalActivationMilestones.test.ts",
    "lib/partner/build583.institutionalSandboxFirstVerificationCard.test.ts",
    "components/partner/launchpad/InstitutionalSandboxFirstVerificationCard.test.tsx",
  ]));
  tiers.push({ tier: "local_automated", status: tierStatus(localSteps), steps: localSteps });

  const simulatedSteps: StepResult[] = [];
  simulatedSteps.push(runVitest(["lib/partner/build583.simulatedSandboxProvisioning.test.ts"]));
  tiers.push({
    tier: "simulated_sandbox_provisioning",
    status: tierStatus(simulatedSteps),
    steps: simulatedSteps,
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
  tiers.push({ tier: "disposable_postgresql", status: tierStatus(disposableSteps), steps: disposableSteps });

  const httpSteps = await runRealAuthenticatedHttpSandbox();
  tiers.push({
    tier: "real_authenticated_http_sandbox",
    status: tierStatus(httpSteps),
    steps: httpSteps,
  });

  const browserSteps = runAuthenticatedBrowserTier();
  tiers.push({
    tier: "authenticated_browser",
    status: tierStatus(browserSteps),
    steps: browserSteps,
  });

  tiers.push({
    tier: "canonical_deployed_application",
    status: "skipped",
    steps: [{
      step: "abraxasworld_xyz",
      status: "skipped",
      detail: "Run against https://abraxasworld.xyz with BUILD583_SANDBOX_BASE_URL in operator environment.",
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

  const completedTiers = tiers.filter((t) => t.status === "pass").map((t) => t.tier);
  const overall = tiers.some((t) => t.status === "fail")
    ? "fail"
    : completedTiers.length > 0
      ? "pass_with_blockers"
      : "blocked";

  console.log(JSON.stringify({ ok: overall !== "fail", build: 583, overall, completed_tiers: completedTiers, tiers }, null, 2));
  process.exit(overall === "fail" ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
