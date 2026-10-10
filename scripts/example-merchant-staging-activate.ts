#!/usr/bin/env tsx
// FILE: scripts/example-merchant-staging-activate.ts
// Build #500 — readiness audit + optional live execution (no mocked success).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildStagingActivationReadinessReport } from "@/lib/partner/universalIntegration/stagingActivationReadiness";
import { exampleMerchantOperatorChecklist } from "@/lib/partner/universalIntegration/exampleMerchantStagingProfile";
import { runStagingLiveE2ePreflight } from "@/lib/partner/universalIntegration/stagingConfigContract";
import { runExampleMerchantLiveE2e } from "@/lib/partner/universalIntegration/exampleMerchantLiveE2eRunner";
import { runLiveSandboxExecution } from "@/lib/partner/universalIntegration/liveSandboxExecution";
import { resolveLiveReceiptCorrelation } from "@/lib/partner/universalIntegration/liveReceiptCorrelation";
import { buildStagingLiveExecutionEvidence } from "@/lib/partner/universalIntegration/stagingExecutionEvidence";
import { validateStagingMeteringExpectations } from "@/lib/partner/universalIntegration/stagingMeteringValidation";
import { chromium } from "playwright";

const REPORT_PATH = process.env.EXAMPLE_MERCHANT_READINESS_REPORT?.trim()
  || "reports/example-merchant-staging-readiness.json";
const EVIDENCE_PATH = process.env.EXAMPLE_MERCHANT_STAGING_EVIDENCE?.trim()
  || "reports/example-merchant-staging-evidence.json";

async function writeJson(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2));
}

async function main() {
  const env = process.env;
  const started = Date.now();
  console.log("=== Example Merchant staging activation (Build #500) ===\n");

  const readiness = await buildStagingActivationReadinessReport(env);
  await writeJson(REPORT_PATH, readiness);

  console.log(`Overall: ${readiness.overall}`);
  console.log(`Policy pack: ${readiness.policy_profile.pack_id} → ${readiness.policy_profile.disclosed_result}\n`);
  for (const f of readiness.findings) {
    console.log(`  [${f.status}] ${f.id}: ${f.detail}`);
  }
  if (readiness.deployment_probe) {
    const p = readiness.deployment_probe;
    console.log(`\nDeployment probe: ${p.detail}`);
    if (p.supabase_project_ref) console.log(`  supabase_ref=${p.supabase_project_ref}`);
    if (p.deployment_environment) console.log(`  deployment=${p.deployment_environment}`);
  }

  console.log("\nOperator checklist:");
  for (const line of exampleMerchantOperatorChecklist()) {
    console.log(`  - ${line}`);
  }

  const executeLive = env.EXAMPLE_MERCHANT_EXECUTE_LIVE?.trim() === "1";
  if (!executeLive) {
    console.log(`\nDry-run complete. Wrote ${REPORT_PATH}`);
    console.log("Set EXAMPLE_MERCHANT_EXECUTE_LIVE=1 to run Playwright + receipt verification.");
    process.exit(readiness.overall === "blocked" ? 1 : readiness.overall === "operator_setup_required" ? 2 : 0);
  }

  const preflight = runStagingLiveE2ePreflight(env);
  if (!preflight.ok || !preflight.config) {
    console.error("\nCannot execute live: staging preflight failed");
    process.exit(1);
  }

  if (readiness.deployment_probe && !readiness.deployment_probe.ok) {
    console.error("\nCannot execute live: staging deployment isolation not confirmed");
    console.error(readiness.deployment_probe.detail);
    process.exit(1);
  }

  const cfg = preflight.config;
  const headless = env.PARTNER_LIVE_E2E_AUTOMATION_SOURCE !== "manual_checkpoint";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    storageState: cfg.storageStatePath ?? undefined,
    extraHTTPHeaders: cfg.vercelProtectionBypass
      ? { "x-vercel-protection-bypass": cfg.vercelProtectionBypass }
      : {},
  });
  const page = await context.newPage();

  const playwrightReport = await runExampleMerchantLiveE2e({
    browser: {
      goto: (url) => page.goto(url, { waitUntil: "domcontentloaded" }).then(() => undefined),
      url: () => page.url(),
      waitForURL: (matcher, options) => page.waitForURL(
        (url) => matcher(new URL(url)),
        { timeout: options?.timeoutMs ?? 120_000 },
      ).then(() => undefined),
    },
  }, env);

  await browser.close();

  const harnessReport = await runLiveSandboxExecution({ fetch, env });
  const correlation = resolveLiveReceiptCorrelation({ config: cfg.rp, env });

  const evidence = buildStagingLiveExecutionEvidence({
    readiness,
    playwright: playwrightReport,
    harness: harnessReport,
    partnerId: cfg.rp.partnerId,
    policyId: cfg.rp.policyId,
    applicationId: cfg.launchpadApplicationId,
    correlationId: correlation.ok ? correlation.correlation.correlation_id : null,
    receiptId: correlation.ok ? correlation.correlation.receipt_id : null,
    startedMs: started,
  });

  const metering = validateStagingMeteringExpectations({
    integrationEventTypes: evidence.live_e2e_complete
      ? ["holder_flow_completed", "receipt_issued", "verification_request_created"]
      : [],
  });

  await writeJson(EVIDENCE_PATH, { evidence, metering, playwright: playwrightReport, harness: harnessReport });

  console.log(`\nEvidence written: ${EVIDENCE_PATH}`);
  console.log(`live_e2e_complete=${evidence.live_e2e_complete} receipt_trust=${evidence.receipt_trust}`);

  if (evidence.live_e2e_complete && evidence.receipt_trust === "pass") {
    process.exit(0);
  }
  if (playwrightReport.overall === "checkpoint") {
    process.exit(2);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
