/**
 * Build #820 contract acceptance on disposable Postgres (not externally attested).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { runBuild820Acceptance } from "./threeLayerTrustAcceptance";

const PROOF_ENABLED = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF_ENABLED ? describe : describe.skip;

const PRIMARY_DB = "abraxas_build820_primary";
const RESTORE_DB = "abraxas_build820_restore";
const PG_HOST = process.env.ABRAXAS_SOVEREIGN_PG_HOST ?? "127.0.0.1";
const PG_USER = process.env.ABRAXAS_SOVEREIGN_PG_USER ?? "postgres";
const PG_PASSWORD = process.env.ABRAXAS_SOVEREIGN_PG_PASSWORD ?? "postgres";

function adminUrl(): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/postgres`;
}

function dbUrl(dbName: string): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/${dbName}`;
}

function resolvePrimaryUrl(): string {
  return (
    process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim()
    ?? process.env.ABRAXAS_DATABASE_URL?.trim()
    ?? dbUrl(PRIMARY_DB)
  );
}

function resolveRestoreUrl(): string {
  return process.env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim() ?? dbUrl(RESTORE_DB);
}

const useOperatorUrls =
  Boolean(process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim())
  && Boolean(process.env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim());

async function recreateDatabase(dbName: string): Promise<void> {
  const admin = new pg.Pool({ connectionString: adminUrl() });
  try {
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`create database "${dbName}"`);
  } finally {
    await admin.end();
  }
}

describeProof("Build #820 three-layer acceptance (CI contract)", () => {
  let primaryPool: pg.Pool;
  let restorePool: pg.Pool;

  beforeAll(async () => {
    if (!useOperatorUrls) {
      await recreateDatabase(PRIMARY_DB);
      await recreateDatabase(RESTORE_DB);
    }
    primaryPool = new pg.Pool({ connectionString: resolvePrimaryUrl() });
    restorePool = new pg.Pool({ connectionString: resolveRestoreUrl() });
  }, 120_000);

  afterAll(async () => {
    await primaryPool?.end().catch(() => undefined);
    await restorePool?.end().catch(() => undefined);
  });

  it("runs contract acceptance and reports incomplete external gates", async () => {
    const report = await runBuild820Acceptance({
      primaryPool,
      restorePool,
      env: {
        ABRAXAS_BUILD_820_CI_CONTRACT: "1",
        ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
        ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
        ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED: "true",
        ABRAXAS_DATABASE_URL: resolvePrimaryUrl(),
        ABRAXAS_SOVEREIGN_STAGING_PG_URL: resolvePrimaryUrl(),
        ABRAXAS_SOVEREIGN_RESTORE_PG_URL: resolveRestoreUrl(),
        ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED: "true",
        ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION: "build820-ci",
        ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION_EXPECTED: "build820-ci",
        ABRAXAS_BACKUP_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
        NEXT_PUBLIC_SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    });

    expect(report.execution_tier).toBe("ci_disposable_contract");
    expect(report.incomplete_gates).toContain("external_staging_attestation");
    expect(report.three_layer_happy_path.verdict).toBe("pass");
    expect(report.adverse_scenarios.every((s) => s.verdict === "pass")).toBe(true);
    expect(report.recovery?.reconcile_ok).toBe(true);
    expect(report.limitations.some((l) => l.includes("minimumStatusVersion"))).toBe(true);
  });
});
