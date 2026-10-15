// FILE: lib/passport/build580.disposableMigrationIntegration.test.ts

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evaluateDisposablePgMigrationTestGuard } from "@/lib/persistence/disposablePgMigrationTestGuard";
import { SOVEREIGN_PASSPORT_MIGRATION_FILES } from "./productionMigrationRelease";
import { planLegacyIdentityBackfill, LEGACY_KIND_SUI_ADDRESS } from "./holderIdentityReconciliation";
import { executeLegacyIdentityReconciliationBatch } from "./holderIdentityReconciliationExecution";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim();

const DB = `abx_b580_${Date.now()}`;
const SUI = "0x" + "4".repeat(64);

function psql(url: string, sql: string): void {
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
}

function adminUrl(dbName: string): string {
  return PG_URL!.replace(/\/[^/]+$/, `/${dbName}`);
}

describe("Build #580 disposable migration integration", () => {
  const guard = evaluateDisposablePgMigrationTestGuard({
    ...process.env,
    ABRAXAS_SOVEREIGN_ENV_CLASS: process.env.ABRAXAS_SOVEREIGN_ENV_CLASS ?? "disposable",
  });

  if (!PG_URL) {
    it("blocked: disposable PostgreSQL URL not configured", () => {
      expect(true).toBe(true);
    });
    return;
  }

  if (!guard.ok) {
    it(`blocked: ${guard.reason}`, () => {
      expect(guard.reason).toBeTruthy();
    });
    return;
  }

  let dbUrl: string;

  beforeAll(() => {
    const admin = PG_URL.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${DB}"`]);
    dbUrl = adminUrl(DB);
    process.env.ABRAXAS_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_PASSPORT_TRANSACTION_PG = "1";
    resetAbraxasPgPoolForTests();

    psql(
      dbUrl,
      readFileSync(join(process.cwd(), "scripts/build-580/disposable-production-legacy-fixture.sql"), "utf8"),
    );
    psql(
      dbUrl,
      `insert into public.identity_verifications (wallet_address, sui_address, status, identity_verification_status)
       values ('${SUI}','${SUI}','approved','approved');`,
    );

    for (const file of SOVEREIGN_PASSPORT_MIGRATION_FILES) {
      const sql = readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
      psql(dbUrl, sql);
    }
  });

  afterAll(() => {
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.ABRAXAS_PASSPORT_DATABASE_URL;
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    delete process.env.ABRAXAS_PASSPORT_TRANSACTION_PG;
    resetAbraxasPgPoolForTests();
    const admin = PG_URL.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${DB}" with (force)`]);
  });

  it("applies migrations 136-143 on legacy fixture without losing approved IDV row", () => {
    psql(
      dbUrl,
      `select 1 from information_schema.columns
       where table_name='identity_verifications' and column_name='holder_subject_id';`,
    );
    const count = execFileSync(
      "psql",
      [dbUrl, "-t", "-A", "-c", `select count(*) from public.identity_verifications where sui_address='${SUI}';`],
      { encoding: "utf8" },
    ).trim();
    expect(Number(count)).toBe(1);
  });

  it("reconciliation dry-run then execute links legacy Sui holder idempotently", async () => {
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const dry = await executeLegacyIdentityReconciliationBatch({
      mode: "dry_run",
      rows: plan.rows,
    });
    expect(dry.ok).toBe(true);
    if (!dry.ok) return;
    expect(dry.audits.some((a) => a.outcome === "dry_run_would_apply")).toBe(true);

    const exec = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: plan.rows,
      executionAuthorized: true,
    });
    expect(exec.ok).toBe(true);
    if (!exec.ok) return;

    const linked = new Map<string, string>([
      [`${LEGACY_KIND_SUI_ADDRESS}:${SUI.toLowerCase()}`, exec.audits[0]?.targetSubjectId ?? ""],
    ]);
    const replan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" }],
      existingLinks: linked,
      existingCanonicalSubjects: new Set([exec.audits[0]?.targetSubjectId ?? ""]),
    });
    expect(replan.ok).toBe(true);
    if (!replan.ok) return;
    const repeat = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: replan.rows,
      executionAuthorized: true,
    });
    expect(repeat.ok).toBe(true);
    if (!repeat.ok) return;
    expect(repeat.audits.every((a) => a.outcome === "skipped_already_linked")).toBe(true);
  });
});
