#!/usr/bin/env tsx
// FILE: scripts/example-merchant-live-e2e.ts
// Playwright Example Merchant live holder flow + artifact + live sandbox verify.

import { chromium } from "playwright";
import { runExampleMerchantLiveE2e } from "@/lib/partner/universalIntegration/exampleMerchantLiveE2eRunner";
import { runLiveSandboxExecution } from "@/lib/partner/universalIntegration/liveSandboxExecution";
import { runStagingLiveE2ePreflight } from "@/lib/partner/universalIntegration/stagingConfigContract";

const INTERACTIVE = process.argv.includes("--interactive") || process.argv.includes("--checkpoint");

async function main() {
  const env = { ...process.env };
  if (INTERACTIVE) {
    env.PARTNER_LIVE_E2E_AUTOMATION_SOURCE = "manual_checkpoint";
  }

  const preflight = runStagingLiveE2ePreflight(env);
  if (!preflight.ok || !preflight.config) {
    console.error("Staging preflight failed:", preflight.errors.join(", "));
    process.exit(1);
  }

  const cfg = preflight.config;
  const browser = await chromium.launch({ headless: !INTERACTIVE });
  const context = await browser.newContext({
    storageState: cfg.storageStatePath ?? undefined,
    extraHTTPHeaders: cfg.vercelProtectionBypass
      ? { "x-vercel-protection-bypass": cfg.vercelProtectionBypass }
      : {},
  });
  const page = await context.newPage();

  const runnerReport = await runExampleMerchantLiveE2e({
    browser: {
      goto: (url) => page.goto(url, { waitUntil: "domcontentloaded" }).then(() => undefined),
      url: () => page.url(),
      waitForURL: (matcher, options) => page.waitForURL(
        (url) => matcher(new URL(url)),
        { timeout: options?.timeoutMs ?? 120_000 },
      ).then(() => undefined),
    },
  }, env);

  console.log("\n=== Example Merchant live E2E (Playwright) ===\n");
  for (const step of runnerReport.steps) {
    console.log(`[${step.ok ? "PASS" : "FAIL"}] ${step.id}: ${step.detail}`);
  }

  if (runnerReport.overall === "checkpoint") {
    console.log("\nCheckpoint: complete holder verification in the browser, capture callback, re-run without --interactive.");
    await browser.close();
    process.exit(2);
  }

  if (runnerReport.overall !== "pass") {
    console.log("\nBlockers:", runnerReport.blockers.join(", "));
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  console.log("\n=== Live sandbox server-side receipt verify ===\n");
  const harness = await runLiveSandboxExecution({ fetch, env });
  for (const stage of harness.stages) {
    console.log(`  [${stage.status.toUpperCase()}${stage.live ? " live" : ""}] ${stage.id}: ${stage.detail}`);
  }
  console.log(`\nOverall harness: ${harness.overall} live_e2e_complete=${harness.live_e2e_complete}`);

  const exit = harness.overall === "pass" ? 0 : harness.overall === "partial" ? 2 : 1;
  process.exit(exit);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
