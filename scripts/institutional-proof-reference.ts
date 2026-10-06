#!/usr/bin/env npx tsx
// FILE: scripts/institutional-proof-reference.ts
// Optional sandbox runner — refuses production by default.

import { assembleInstitutionalEvidencePacket } from "@/lib/operations/institutionalProof/assembleEvidencePacket";
import { renderInstitutionalProofReport } from "@/lib/operations/institutionalProof/renderReport";
import { renderInstitutionalDiligenceSummary } from "@/lib/operations/institutionalProof/renderDiligenceSummary";

async function main() {
  const forceProduction = process.argv.includes("--allow-production");
  const isProduction = process.env.NODE_ENV === "production"
    || process.env.VERCEL_ENV === "production";

  if (isProduction && !forceProduction) {
    console.error("Refusing to run institutional proof reference scenario in production.");
    console.error("Use sandbox/preview environment or pass --allow-production explicitly.");
    process.exit(1);
  }

  console.error("NOTE: Live sandbox runner requires configured test DB and provider secrets.");
  console.error("This script documents the runner contract; CI uses referenceScenario.test.ts.");
  console.error("For live execution, configure sandbox env vars and run vitest:");
  console.error("  npx vitest run lib/operations/institutionalProof/referenceScenario.test.ts");

  const { assessProductionReadiness } = await import("@/lib/operations/institutionalProof/readiness");
  const readiness = await assessProductionReadiness();
  console.log(JSON.stringify({
    runner: "institutional-proof-reference",
    environment: isProduction ? "production" : "sandbox",
    status: "documented_only",
    readiness,
    message: "Execute referenceScenario.test.ts in CI for full evidence packet generation.",
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
