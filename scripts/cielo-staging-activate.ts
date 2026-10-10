#!/usr/bin/env tsx
// FILE: scripts/cielo-staging-activate.ts
// Cielo Sunrise staging activation — readiness only unless CIELO_EXECUTE_LIVE_HOLDER_FLOW=1.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildCieloStagingActivationReport } from "@/lib/cielo/cieloStagingActivation";
import { cieloOperatorActivationChecklist } from "@/lib/cielo/cieloMerchantProfile";

const REPORT_PATH = process.env.CIELO_STAGING_READINESS_REPORT?.trim()
  || "reports/cielo-staging-readiness.json";

async function main() {
  console.log("=== Cielo Sunrise staging activation (Build #501) ===\n");

  const report = await buildCieloStagingActivationReport(process.env);
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`Merchant: ${report.merchant.merchant_name}`);
  console.log(`Partner: ${report.merchant.partner_id} · Policy: ${report.merchant.policy_id}`);
  console.log(`Disclosure: ${report.merchant.disclosed_result} · Asset: ${report.merchant.genesis_asset_id}`);
  console.log(`Integration: ${report.merchant.integration_mode}`);
  console.log(`\nOverall: ${report.overall}\n`);

  for (const f of report.universal.findings) {
    console.log(`  [${f.status}] ${f.id}: ${f.detail}`);
  }

  if (report.cielo_e2e) {
    console.log("\nCielo E2E checks:");
    for (const c of report.cielo_e2e.checks) {
      console.log(`  [${c.status}] ${c.label}: ${c.detail}`);
    }
  } else {
    console.log("\nCielo E2E checks: skipped (no Supabase env in this shell — unverified)");
  }

  console.log("\nOperator checklist:");
  for (const line of cieloOperatorActivationChecklist()) {
    console.log(`  - ${line}`);
  }

  console.log(`\nWrote ${REPORT_PATH}`);

  if (process.env.CIELO_EXECUTE_LIVE_HOLDER_FLOW?.trim() === "1") {
    console.log("\nLive holder flow must be completed manually at /cielo/verified-rate on staging.");
    console.log("Do not use ?fixture= for production proof. Operator checkpoint required for MFA/biometrics.");
    process.exit(report.overall === "ready_to_execute" ? 2 : 1);
  }

  process.exit(report.overall === "blocked" ? 1 : report.overall === "operator_setup_required" ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
