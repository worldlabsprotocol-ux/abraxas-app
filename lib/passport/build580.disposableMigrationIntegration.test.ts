// FILE: lib/passport/build580.disposableMigrationIntegration.test.ts

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import { evaluateDisposablePgMigrationTestGuard } from "@/lib/persistence/disposablePgMigrationTestGuard";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { computeReconciliationBatchDigest } from "./holderIdentityReconciliationAuth";
import { planLegacyIdentityBackfill, LEGACY_KIND_SUI_ADDRESS } from "./holderIdentityReconciliation";
import { executeLegacyIdentityReconciliationBatch } from "./holderIdentityReconciliationExecution";
import { SOVEREIGN_PASSPORT_MIGRATION_FILES } from "./productionMigrationRelease";
import { SOVEREIGN_DISPOSABLE_DATABASE_ID } from "@/lib/persistence/disposablePgTestEnv";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim();

const guard = evaluateDisposablePgMigrationTestGuard({
  ...process.env,
  ABRAXAS_SOVEREIGN_ENV_CLASS: process.env.ABRAXAS_SOVEREIGN_ENV_CLASS ?? "disposable",
});

const canRunDisposable = Boolean(PG_URL) && guard.ok;
const blockedReason = !PG_URL ? "missing_disposable_postgresql_url" : guard.ok ? "" : guard.reason;

const DB = `abx_b580_${Date.now()}`;
const SUI = "0x" + "4".repeat(64);
const SUI_B = "0x" + "5".repeat(64);

function psql(url: string, sql: string): void {
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
}

function adminUrl(dbName: string): string {
  return PG_URL!.replace(/\/[^/]+$/, `/${dbName}`);
}

function hybridDisposableEnv(dbUrl: string, batchDigest: string): Record<string, string> {
  return {
    ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
    ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID: SOVEREIGN_DISPOSABLE_DATABASE_ID,
    ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED: "true",
    ABRAXAS_DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED: "true",
    ABRAXAS_DISPOSABLE_PG_TEST_URL: dbUrl,
    ABRAXAS_RECONCILIATION_EXECUTION_ENABLED: "true",
    ABRAXAS_OPERATOR_RECONCILIATION_AUTH_ID: "op-test-auth-580",
    ABRAXAS_RECONCILIATION_BATCH_DIGEST: batchDigest,
    ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF: SOVEREIGN_DISPOSABLE_REF,
  };
}

describe("Build #580 disposable migration integration — infrastructure", () => {
  it("reports blocked or ready state explicitly", () => {
    if (canRunDisposable) {
      expect(blockedReason).toBe("");
    } else {
      expect(blockedReason.length).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(!canRunDisposable)("Build #580 disposable migration integration", () => {
  let dbUrl: string;

  beforeAll(() => {
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${DB}"`]);
    dbUrl = adminUrl(DB);
    process.env.ABRAXAS_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_PASSPORT_TRANSACTION_PG = "1";
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID = SOVEREIGN_DISPOSABLE_DATABASE_ID;
    process.env.ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED = "true";
    process.env.ABRAXAS_DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED = "true";
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_URL = dbUrl;
    process.env.ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF = SOVEREIGN_DISPOSABLE_REF;
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
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${DB}" with (force)`]);
  });

  it("applies migrations 136-143 on legacy fixture without losing approved IDV row", () => {
    const count = execFileSync(
      "psql",
      [dbUrl, "-t", "-A", "-c", `select count(*) from public.identity_verifications where sui_address='${SUI}';`],
      { encoding: "utf8" },
    ).trim();
    expect(Number(count)).toBe(1);
  });

  it("rejects execute without operator authorization credentials", async () => {
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const exec = await executeLegacyIdentityReconciliationBatch({ mode: "execute", rows: plan.rows });
    expect(exec.ok).toBe(false);
  });

  it("reconciliation dry-run then authorized execute links legacy Sui holder idempotently", async () => {
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const digest = computeReconciliationBatchDigest(plan.rows);

    const dry = await executeLegacyIdentityReconciliationBatch({ mode: "dry_run", rows: plan.rows });
    expect(dry.ok).toBe(true);

    const exec = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: plan.rows,
      credentials: {
        batchDigest: digest,
        operatorAuthorizationId: "op-test-auth-580",
        expiresAtMs: Date.now() + 120_000,
      },
      env: { ...process.env, ...hybridDisposableEnv(dbUrl, digest) },
    });
    expect(exec.ok).toBe(true);
    if (!exec.ok) return;
    expect(exec.audits.some((a) => a.outcome === "applied" || a.outcome === "skipped_already_linked")).toBe(true);

    const linked = new Map<string, string>([
      [`${LEGACY_KIND_SUI_ADDRESS}:${SUI.toLowerCase()}`, exec.audits[0]?.persistedSubjectId ?? ""],
    ]);
    const replan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" }],
      existingLinks: linked,
      existingCanonicalSubjects: new Set([exec.audits[0]?.persistedSubjectId ?? ""]),
    });
    expect(replan.ok).toBe(true);
    if (!replan.ok) return;
    const repeatDigest = computeReconciliationBatchDigest(replan.rows);
    const repeat = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: replan.rows,
      credentials: {
        batchDigest: repeatDigest,
        operatorAuthorizationId: "op-test-auth-580",
        expiresAtMs: Date.now() + 120_000,
      },
      env: { ...process.env, ...hybridDisposableEnv(dbUrl, repeatDigest) },
    });
    expect(repeat.ok).toBe(true);
    if (!repeat.ok) return;
    expect(repeat.audits.every((a) => a.outcome === "skipped_already_linked")).toBe(true);
  });

  it("concurrent link claims resolve to one persisted canonical subject", async () => {
    psql(
      dbUrl,
      `insert into public.identity_verifications (wallet_address, sui_address, status, identity_verification_status)
       values ('${SUI_B}','${SUI_B}','approved','approved');`,
    );
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_B, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const digest = computeReconciliationBatchDigest(plan.rows);
    const env = { ...process.env, ...hybridDisposableEnv(dbUrl, digest) };
    const creds = {
      batchDigest: digest,
      operatorAuthorizationId: "op-test-auth-580",
      expiresAtMs: Date.now() + 120_000,
    };

    const [a, b] = await Promise.all([
      executeLegacyIdentityReconciliationBatch({ mode: "execute", rows: plan.rows, credentials: creds, env }),
      executeLegacyIdentityReconciliationBatch({ mode: "execute", rows: plan.rows, credentials: creds, env }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const subjects = new Set(
      [...a.audits, ...b.audits]
        .map((audit) => audit.persistedSubjectId)
        .filter(Boolean),
    );
    expect(subjects.size).toBe(1);
    const owner = execFileSync(
      "psql",
      [dbUrl, "-t", "-A", "-c", `select subject_id from public.passport_holder_legacy_links where legacy_key='${SUI_B.toLowerCase()}';`],
      { encoding: "utf8" },
    ).trim();
    expect(subjects.has(owner)).toBe(true);
  });

  it("blocks mapping one anchor to a different requested canonical subject when link exists", async () => {
    const SUI_C = "0x" + "c".repeat(64);
    psql(
      dbUrl,
      `insert into public.identity_verifications (wallet_address, sui_address, status, identity_verification_status)
       values ('${SUI_C}','${SUI_C}','approved','approved');`,
    );
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_C, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const digest = computeReconciliationBatchDigest(plan.rows);
    const first = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: plan.rows,
      credentials: {
        batchDigest: digest,
        operatorAuthorizationId: "op-test-auth-580",
        expiresAtMs: Date.now() + 120_000,
      },
      env: { ...process.env, ...hybridDisposableEnv(dbUrl, digest) },
    });
    expect(first.ok).toBe(true);

    const stalePlan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_C, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
      boundCanonicalSubjectId: "abx_hs_" + "f".repeat(32),
    });
    expect(stalePlan.ok).toBe(true);
    if (!stalePlan.ok) return;
    const staleDigest = computeReconciliationBatchDigest(stalePlan.rows);
    const stale = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: stalePlan.rows,
      credentials: {
        batchDigest: staleDigest,
        operatorAuthorizationId: "op-test-auth-580",
        expiresAtMs: Date.now() + 120_000,
      },
      env: { ...process.env, ...hybridDisposableEnv(dbUrl, staleDigest) },
    });
    expect(stale.ok).toBe(true);
    if (!stale.ok) return;
    expect(
      stale.audits.some((a) =>
        a.outcome === "blocked_stale_link_conflict" || a.outcome === "blocked_link_claim_conflict",
      ),
    ).toBe(true);
  });

  it("rejects execution when configured project ref disagrees with derived disposable identity", async () => {
    const SUI_OVERRIDE = "0x" + "e".repeat(64);
    psql(
      dbUrl,
      `insert into public.identity_verifications (wallet_address, sui_address, status, identity_verification_status)
       values ('${SUI_OVERRIDE}','${SUI_OVERRIDE}','approved','approved');`,
    );
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_OVERRIDE, evidence: "forged.evidence.string" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const digest = computeReconciliationBatchDigest(plan.rows);
    const exec = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: plan.rows,
      credentials: {
        batchDigest: digest,
        operatorAuthorizationId: "op-test-auth-580",
        expiresAtMs: Date.now() + 120_000,
      },
      env: {
        ...process.env,
        ...hybridDisposableEnv(dbUrl, digest),
        ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF: "wrong_project_ref_override",
      },
    });
    expect(exec.ok).toBe(false);
    if (exec.ok) return;
    expect(exec.code).toBe("configured_ref_overrides_derived_identity");
  });

  it("rolls back link and subject when IDV binding fails after link insertion", async () => {
    const SUI_D = "0x" + "d".repeat(64);
    const foreignSubject = "abx_hs_" + "1".repeat(32);
    psql(
      dbUrl,
      `insert into public.passport_holder_subjects (subject_id) values ('${foreignSubject}');
       insert into public.identity_verifications (wallet_address, sui_address, status, identity_verification_status, holder_subject_id)
       values ('${SUI_D}','${SUI_D}','approved','approved','${foreignSubject}');`,
    );
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_D, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const digest = computeReconciliationBatchDigest(plan.rows);
    const exec = await executeLegacyIdentityReconciliationBatch({
      mode: "execute",
      rows: plan.rows,
      credentials: {
        batchDigest: digest,
        operatorAuthorizationId: "op-test-auth-580",
        expiresAtMs: Date.now() + 120_000,
      },
      env: { ...process.env, ...hybridDisposableEnv(dbUrl, digest) },
    });
    expect(exec.ok).toBe(true);
    if (!exec.ok) return;
    expect(exec.audits.some((a) => a.outcome === "blocked_row_rolled_back")).toBe(true);
    const linkCount = execFileSync(
      "psql",
      [dbUrl, "-t", "-A", "-c", `select count(*) from public.passport_holder_legacy_links where legacy_key='${SUI_D.toLowerCase()}';`],
      { encoding: "utf8" },
    ).trim();
    expect(Number(linkCount)).toBe(0);
  });
});
