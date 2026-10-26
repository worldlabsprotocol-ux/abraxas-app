/**
 * Build #853 — wallet-native sovereign protocol execution (CI contract).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { runBuild853WalletSovereignExecution } from "./build853WalletSovereignExecution";

const PROOF_ENABLED = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF_ENABLED ? describe : describe.skip;

const DB = "abraxas_build853_primary";
const PG_HOST = process.env.ABRAXAS_SOVEREIGN_PG_HOST ?? "127.0.0.1";
const PG_USER = process.env.ABRAXAS_SOVEREIGN_PG_USER ?? "postgres";
const PG_PASSWORD = process.env.ABRAXAS_SOVEREIGN_PG_PASSWORD ?? "postgres";

function adminUrl(): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/postgres`;
}

function dbUrl(dbName: string): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/${dbName}`;
}

async function recreateDatabase(dbName: string): Promise<void> {
  const admin = new pg.Pool({ connectionString: adminUrl() });
  try {
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`create database "${dbName}"`);
  } finally {
    await admin.end();
  }
}

describeProof("Build #853 wallet sovereign execution", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    if (!process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim()) {
      await recreateDatabase(DB);
    }
    const url = process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim() ?? dbUrl(DB);
    pool = new pg.Pool({ connectionString: url });
  }, 120_000);

  afterAll(async () => {
    await pool?.end().catch(() => undefined);
  });

  it("runs wallet-scoped authorization through sovereign validity and independent verify", async () => {
    const url = process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim() ?? dbUrl(DB);
    const report = await runBuild853WalletSovereignExecution({
      primaryPool: pool,
      env: {
        ABRAXAS_BUILD_853_CI_CONTRACT: "1",
        ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
        ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
        ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED: "true",
        ABRAXAS_DATABASE_URL: url,
        ABRAXAS_SOVEREIGN_STAGING_PG_URL: url,
      },
    });
    expect(report.build).toBe("853");
    expect(report.scenarios.every((s) => s.verdict === "pass")).toBe(true);
  });
});
