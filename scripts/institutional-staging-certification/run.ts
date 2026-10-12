#!/usr/bin/env npx tsx
// FILE: scripts/institutional-staging-certification/run.ts
// Sanitized institutional staging certification orchestrator (no secrets in output).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { probeStagingDeploymentIdentity } from "@/lib/partner/universalIntegration/stagingActivationReadiness";
import { resolveInstitutionalStagingTarget } from "@/lib/partner/launchpad/resolveInstitutionalStagingTarget";
import { redactBypassFromUrl, vercelBypassHeaders } from "@/lib/preview/vercelBypass";
import { buildStagingActivationReadinessReport } from "@/lib/partner/universalIntegration/stagingActivationReadiness";

const REPORT_PATH =
  process.env.INSTITUTIONAL_STAGING_CERT_REPORT?.trim()
  || "reports/institutional-staging-certification.json";

interface CertificationCase {
  id: string;
  status: "pass" | "fail" | "blocked" | "skipped";
  detail: string;
}

async function probeSupabaseBinding(baseUrl: string, bypass: string): Promise<CertificationCase> {
  try {
    const res = await fetch(`${baseUrl}/api/preview/supabase-binding`, {
      headers: vercelBypassHeaders(bypass, { setCookie: false }),
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      return {
        id: "preview_supabase_binding",
        status: "fail",
        detail: `unexpected redirect status=${res.status}`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        id: "preview_supabase_binding",
        status: "fail",
        detail: `HTTP ${res.status}`,
      };
    }
    const allMatch = body.all_match_demo === true;
    const productionDetected = body.production_ref_detected === true;
    if (productionDetected) {
      return {
        id: "preview_supabase_binding",
        status: "fail",
        detail: "production_ref_detected on preview binding probe",
      };
    }
    return {
      id: "preview_supabase_binding",
      status: allMatch ? "pass" : "fail",
      detail: allMatch
        ? `demo ref aligned url=${String(body.url_project_ref ?? "unknown")}`
        : `all_match_demo=${String(body.all_match_demo)}`,
    };
  } catch (error) {
    return {
      id: "preview_supabase_binding",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const resolved = resolveInstitutionalStagingTarget();
  const cases: CertificationCase[] = [];

  if (!resolved.ok) {
    const report = {
      generated_at: startedAt,
      staging_infrastructure: "BLOCKED",
      blockers: resolved.blockers,
      cases,
    };
    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.error("Institutional staging certification BLOCKED:");
    for (const b of resolved.blockers) console.error(`  - ${b}`);
    process.exit(2);
  }

  const { stagingUrl, expectedSupabaseRef, vercelProtectionBypass } = resolved.target;
  const safeUrl = redactBypassFromUrl(stagingUrl);

  process.env.LAUNCHPAD_STAGING_URL = stagingUrl;
  process.env.LAUNCHPAD_EXPECTED_SUPABASE_REF = expectedSupabaseRef;
  process.env.PARTNER_FLOW_RP_BASE_URL = stagingUrl;

  cases.push(await probeSupabaseBinding(stagingUrl, vercelProtectionBypass));

  const identity = await probeStagingDeploymentIdentity({
    baseUrl: stagingUrl,
    expectedSupabaseRef,
    vercelBypass: vercelProtectionBypass,
  });
  cases.push({
    id: "launchpad_staging_identity",
    status: identity.ok ? "pass" : identity.blocked_by_vercel_protection ? "blocked" : "fail",
    detail: identity.detail,
  });

  const readiness = await buildStagingActivationReadinessReport(process.env);
  cases.push({
    id: "example_merchant_readiness",
    status:
      readiness.overall === "ready_to_execute"
        ? "pass"
        : readiness.overall === "operator_setup_required"
          ? "blocked"
          : "fail",
    detail: readiness.overall,
  });

  const runSmoke = process.env.INSTITUTIONAL_STAGING_RUN_SMOKE?.trim() === "1";
  if (runSmoke && identity.ok) {
    try {
      execSync("npm run smoke:launchpad:staging", {
        stdio: "pipe",
        encoding: "utf8",
        env: process.env,
      });
      cases.push({ id: "launchpad_staging_smoke", status: "pass", detail: "smoke:launchpad:staging exit 0" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      cases.push({
        id: "launchpad_staging_smoke",
        status: "fail",
        detail: redactBypassFromUrl(message.slice(0, 500)),
      });
    }
  } else {
    cases.push({
      id: "launchpad_staging_smoke",
      status: "skipped",
      detail: runSmoke ? "skipped: staging identity not confirmed" : "set INSTITUTIONAL_STAGING_RUN_SMOKE=1 to execute",
    });
  }

  const runPlaywright = process.env.INSTITUTIONAL_STAGING_RUN_PLAYWRIGHT?.trim() === "1";
  if (runPlaywright && identity.ok) {
    const specs = [
      "tests/staging/v2-operational-surfaces.spec.ts",
      "tests/staging/v2-operational-a11y.spec.ts",
      "tests/staging/v2-operational-axe.spec.ts",
    ];
    try {
      execSync(
        `./node_modules/.bin/playwright test ${specs.join(" ")}`,
        { stdio: "pipe", encoding: "utf8", env: process.env },
      );
      cases.push({ id: "v2_operational_playwright", status: "pass", detail: "v2 surfaces + a11y + axe exit 0" });
    } catch (error) {
      cases.push({
        id: "v2_operational_playwright",
        status: "fail",
        detail: redactBypassFromUrl((error instanceof Error ? error.message : String(error)).slice(0, 500)),
      });
    }
  } else {
    cases.push({
      id: "v2_operational_playwright",
      status: "skipped",
      detail: runPlaywright ? "skipped: staging identity not confirmed" : "set INSTITUTIONAL_STAGING_RUN_PLAYWRIGHT=1",
    });
  }

  const infrastructureReady =
    cases.find((c) => c.id === "preview_supabase_binding")?.status === "pass"
    && cases.find((c) => c.id === "launchpad_staging_identity")?.status === "pass";

  let commitSha: string | null = null;
  if (identity.ok && identity.commit_sha_prefix) {
    commitSha = identity.commit_sha_prefix;
  }

  const report = {
    generated_at: startedAt,
    staging_infrastructure: infrastructureReady ? "READY" : "BLOCKED",
    staging_url: safeUrl,
    expected_supabase_ref: expectedSupabaseRef,
    deployed_commit_sha_prefix: commitSha,
    solana_network: "devnet_only",
    production_promotion: "not_requested",
    cases,
    readiness_summary: {
      overall: readiness.overall,
      finding_ids: readiness.findings.map((f) => ({ id: f.id, status: f.status })),
    },
    operator_notes: [
      "Never commit API keys, bypass tokens, or PLAYWRIGHT_STORAGE_STATE.",
      "Authenticated partner lifecycle requires operator-provisioned PARTNER_FLOW_RP_* and holder session.",
      "Institutional custody activation remains independent of staging certification.",
    ],
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Wrote ${resolve(REPORT_PATH)}`);
  console.log(`Staging infrastructure: ${report.staging_infrastructure}`);
  for (const c of cases) {
    console.log(`  [${c.status}] ${c.id}: ${c.detail}`);
  }

  process.exit(infrastructureReady ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
