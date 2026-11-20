#!/usr/bin/env npx tsx
/**
 * BUILD #985 — read-only sovereign sandbox activation preflight.
 * Does not deploy, fund wallets, or mutate cluster state.
 *
 * Run: npm run build-985:preflight
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { assertPreflightReportHasNoRpcSecrets } from "@/lib/partner/integrationStudio/token2022Entitlement/build985PreflightSemantics";
import { buildBuild985PreflightReport } from "@/lib/partner/integrationStudio/token2022Entitlement/build985PreflightReport";
import { evaluateConnectedSandboxBoundary } from "@/lib/partner/integrationStudio/token2022Entitlement/connectedSandboxBoundary";

const OUT =
  process.env.BUILD_985_PREFLIGHT_OUT?.trim() ?? "/opt/cursor/artifacts/build-985-preflight.json";

async function main() {
  const boundary = await evaluateConnectedSandboxBoundary();
  const report = await buildBuild985PreflightReport({ boundary });
  const wire = JSON.stringify(report, null, 2);
  assertPreflightReportHasNoRpcSecrets(wire);

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(OUT, wire);
  console.log(wire);
  console.log(`\nReport written: ${OUT}`);

  const operational = report.acceptance.connected_operational_status;
  if (operational === "BLOCKED" || operational === "NOT_CONFIGURED") {
    process.exit(2);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});