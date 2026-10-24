#!/usr/bin/env npx tsx
/**
 * Build #820 operator acceptance runner (JSON report to stdout).
 * Prefer: npm run sovereign:build-820-acceptance (vitest — resolves workspace packages).
 *
 * External attestation: set ABRAXAS_STAGING_HTTP_BASE_URL + ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED
 * and persistent staging env per SOVEREIGN_STAGING_DEPLOYMENT_CONTRACT.md
 *
 * CI/disposable: ABRAXAS_BUILD_820_CI_CONTRACT=1 (does not claim external acceptance).
 *
 * Note: direct tsx may fail on `server-only` / workspace imports; use vitest entry above for operators.
 */
import pg from "pg";
import { writeFileSync } from "node:fs";
import { runBuild820Acceptance } from "@/lib/persistence/boundary/staging/threeLayerTrustAcceptance";
import { evaluateExternalStagingDeployment } from "@/lib/persistence/boundary/staging/stagingOperationalOwnership";

async function main() {
  const primaryUrl =
    process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim()
    ?? process.env.ABRAXAS_DATABASE_URL?.trim();
  const restoreUrl = process.env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim();
  if (!primaryUrl || !restoreUrl) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "missing_postgres_urls",
        detail: "Set ABRAXAS_SOVEREIGN_STAGING_PG_URL and ABRAXAS_SOVEREIGN_RESTORE_PG_URL",
      }),
    );
    process.exit(2);
  }

  const primaryPool = new pg.Pool({ connectionString: primaryUrl });
  const restorePool = new pg.Pool({ connectionString: restoreUrl });
  try {
    const report = await runBuild820Acceptance({
      primaryPool,
      restorePool,
      env: process.env,
    });
    const outPath = process.env.ABRAXAS_BUILD_820_REPORT_PATH?.trim();
    const json = JSON.stringify(report, null, 2);
    if (outPath) writeFileSync(outPath, json, "utf8");
    console.log(json);

    const external = evaluateExternalStagingDeployment(process.env);
    const contractOnly = external.state === "pending";
    const failed =
      report.three_layer_happy_path.verdict !== "pass"
      || report.adverse_scenarios.some((s) => s.verdict === "fail");

    if (failed) process.exitCode = 1;
    else if (contractOnly) {
      console.error(
        JSON.stringify({
          ok: true,
          warning: "external_staging_not_attested",
          detail: "Contract drill passed; founder attestation still required for Build #820 external acceptance.",
        }),
      );
    }
  } finally {
    await primaryPool.end().catch(() => undefined);
    await restorePool.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
