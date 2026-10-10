#!/usr/bin/env npx tsx
// FILE: scripts/example-merchant-live-sandbox.ts
// Live Example Merchant sandbox proof — infrastructure + optional real receipt verify.

import { runLiveSandboxExecution } from "@/lib/partner/universalIntegration/liveSandboxExecution";
import { READINESS_EVIDENCE_MATRIX } from "@/lib/partner/universalIntegration/readinessEvidenceMatrix";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";

async function main() {
  console.log("=== Example Merchant live sandbox execution ===\n");
  console.log("Required env:", Object.values(REFERENCE_RP_ENV_KEYS).join(", "));
  console.log("Optional:", "EXAMPLE_MERCHANT_LIVE_RECEIPT_ID (after real holder run)\n");

  const report = await runLiveSandboxExecution({ fetch });

  for (const row of READINESS_EVIDENCE_MATRIX) {
    console.log(`[${row.tier}] ${row.label}`);
    console.log(`  Proves: ${row.proves}`);
    console.log(`  Does not prove: ${row.does_not_prove}\n`);
  }

  console.log(`Overall: ${report.overall}`);
  console.log(`Live E2E complete: ${report.live_e2e_complete}`);
  console.log(`Partner: ${report.partner_id} Policy: ${report.policy_id}`);
  console.log("");
  for (const s of report.stages) {
    console.log(`  [${s.status.toUpperCase()}${s.live ? " live" : ""}] ${s.id}: ${s.detail}`);
  }
  if (report.blockers.length) {
    console.log("\nBlockers:", report.blockers.join(", "));
  }
  if (report.manual_steps.length) {
    console.log("Manual steps:", report.manual_steps.join(", "));
  }

  const exit = report.overall === "pass" ? 0 : report.overall === "partial" ? 2 : 1;
  process.exit(exit);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
