#!/usr/bin/env npx tsx
// FILE: scripts/universal-partner-readiness.ts
// Operator CLI: partner conformance + independent contract proof summary.

import {
  formatConformanceReport,
  runPartnerConformance,
} from "@/lib/partner/partnerConformanceHarness";
import { resolvePartnerConformanceOptions } from "@/lib/partner/partnerConformanceConfig";
import {
  EXAMPLE_MERCHANT_INTEGRATION,
  runIndependentPartnerContractProof,
} from "@/lib/partner/universalIntegration";

async function main() {
  const options = resolvePartnerConformanceOptions(process.env);
  if (options.configMissing.length > 0) {
    console.error("Partner conformance env missing:", options.configMissing.join(", "));
    console.error("Set PARTNER_FLOW_RP_* variables or use npm run partner:conformance for details.");
    process.exit(1);
  }

  const conformance = await runPartnerConformance(options, { fetch });
  console.log(formatConformanceReport(conformance));
  console.log("");

  const proof = runIndependentPartnerContractProof(EXAMPLE_MERCHANT_INTEGRATION);
  console.log("=== Independent partner contract proof (Example Merchant) ===");
  console.log(`partner_id: ${proof.partner.partnerId}`);
  console.log(`policy_id: ${proof.partner.policyId}`);
  console.log(`automated_pass: ${proof.allAutomatedPassed}`);
  console.log(`manual_steps: ${proof.manualStepsRequired.join(", ") || "none"}`);
  for (const step of proof.steps) {
    console.log(`  [${step.outcome.toUpperCase()}] ${step.id}: ${step.detail.slice(0, 120)}`);
  }

  const exit = conformance.exitCode !== 0 || !proof.allAutomatedPassed ? 1 : 0;
  process.exit(exit);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
