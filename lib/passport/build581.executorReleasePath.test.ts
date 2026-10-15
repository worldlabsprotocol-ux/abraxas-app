// FILE: lib/passport/build581.executorReleasePath.test.ts

import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { evaluateDisposablePgMigrationTestGuard } from "@/lib/persistence/disposablePgMigrationTestGuard";
import { resetAbraxasPgPoolForTests, withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { buildTestPreflightEnvelope } from "./productionPreflightEnvelope";
import {
  buildTestReconciliationInventoryEnvelope,
  loadProductionReconciliationInventoryEvidence,
} from "./productionReconciliationInventoryEvidence";
import { PRODUCTION_MIGRATION_EXECUTE_TOKEN } from "./productionMigration581";
import {
  executeControlledProductionMigrations,
  executeMigrationPlanWithAdvisoryLock,
  migrationExecutorErrorToResult,
  ProductionMigrationGateError,
  ProductionMigrationStepError,
} from "./productionMigrationExecutor";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim();

const guard = evaluateDisposablePgMigrationTestGuard({
  ...process.env,
  ABRAXAS_SOVEREIGN_ENV_CLASS: process.env.ABRAXAS_SOVEREIGN_ENV_CLASS ?? "disposable",
});

const canRunDisposable = Boolean(PG_URL) && guard.ok;

const probe580Report = {
  build: 580,
  captured_at: new Date().toISOString(),
  project_ref_expected: PRODUCTION_SUPABASE_PROJECT_REF,
  public_table_count: 120,
  prerequisites: {
    passport_holder_subjects: false,
    passport_holder_legacy_links: false,
    passport_holder_wallet_accounts: false,
    identity_verifications_holder_subject_id: false,
    passport_idv_consent_records: false,
    sovereign_credential_issuance_audit: false,
  },
  migrations_140_143: {
    passport_holder_possession_keys: false,
    passport_reusable_credentials: false,
    linked_credential_jti: false,
    passport_institutional_presentation_consents: false,
    passport_institutional_authorization_commits: false,
    signing_claim_token: false,
    consume_passport_possession_challenge: false,
  },
  legacy_identity_columns: {
    identity_verifications_sui_address: true,
    identity_verifications_wallet_address: true,
  },
};

const preflightEnvelope = buildTestPreflightEnvelope(probe580Report);

function sampleInventoryEnvelope() {
  return buildTestReconciliationInventoryEnvelope({
    linkedPreflightCapturedAt: probe580Report.captured_at,
    inventory: {
      captured_at: new Date().toISOString(),
      approved_sui_idv_eligible: 2,
      pending_review_idv: 1,
      rejected_or_expired_idv: 0,
      idv_with_canonical_subject: 0,
      verified_wallet_bindings: null,
      legacy_links_present: null,
      canonical_subjects_present: null,
      sui_unlinked_not_approved: 0,
      approved_unlinked_needs_reconciliation: 2,
      zklogin_continuity_records: null,
      ambiguous_mapping_blocked: 0,
    },
  });
}

function fullPhaseBEnv(nonce: string, includeInventory = true): Record<string, string> {
  const env: Record<string, string> = {
    ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(preflightEnvelope),
    ABRAXAS_PRODUCTION_PREFLIGHT_MAX_AGE_HOURS: "24",
    ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED: "true",
    ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID: "founder-ack-12345678",
    ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN: PRODUCTION_MIGRATION_EXECUTE_TOKEN,
    ABRAXAS_PRODUCTION_MIGRATION_DDL_AUTHORIZED: "true",
    ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ID: "op-prod-581",
    ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ACK: "op-prod-581",
    ABRAXAS_FOUNDER_BACKUP_CHECKPOINT_ID: "chk-123",
    ABRAXAS_FOUNDER_BACKUP_RESTORE_TESTED: "true",
    ABRAXAS_PRODUCTION_MIGRATION_REHEARSAL_ATTESTED: "true",
    ABRAXAS_PRODUCTION_MIGRATION_EXECUTION_NONCE: nonce,
    NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF: PRODUCTION_SUPABASE_PROJECT_REF,
    ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED: "true",
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    ABRAXAS_PASSPORT_TRANSACTION_PG: "true",
  };
  if (includeInventory) {
    env.ABRAXAS_PRODUCTION_RECONCILIATION_INVENTORY_JSON = JSON.stringify(sampleInventoryEnvelope());
    env.ABRAXAS_PRODUCTION_RECONCILIATION_INVENTORY_MAX_AGE_HOURS = "24";
  }
  return env;
}

vi.mock("./reconciliationDatabaseBinding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./reconciliationDatabaseBinding")>();
  return {
    ...actual,
    assertReconciliationDatabaseBinding: vi.fn(async () => ({
      ok: true as const,
      bindingMode: "supabase_dual_identity" as const,
      derivedProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      postgrestProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      configuredCrossCheckRef: null,
    })),
  };
});

describe("Build #581 inventory evidence contract", () => {
  it("loads inventory linked to preflight for admin and executor", () => {
    const loaded = loadProductionReconciliationInventoryEvidence(fullPhaseBEnv("nonce-inv"));
    expect(loaded.ok).toBe(true);
  });

  it("rejects missing inventory artifact", () => {
    const loaded = loadProductionReconciliationInventoryEvidence(fullPhaseBEnv("nonce-no-inv", false));
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.code).toBe("inventory_missing");
  });
});

describe.skipIf(!canRunDisposable)("Build #581 controlled executor release path", () => {
  const DB = `abx_b581_exec_${Date.now()}`;
  let dbUrl: string;

  beforeAll(() => {
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${DB}"`]);
    dbUrl = PG_URL!.replace(/\/[^/]+$/, `/${DB}`);
    process.env.ABRAXAS_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;
    resetAbraxasPgPoolForTests();
  });

  afterAll(() => {
    resetAbraxasPgPoolForTests();
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${DB}" with (force)`]);
  });

  it("reaches migration execution path when all gates satisfied (dry run)", async () => {
    const env = fullPhaseBEnv("nonce-exec-ready");
    env.ABRAXAS_DATABASE_URL = dbUrl;
    env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;

    const result = await withAbraxasPgTransaction(async (client) =>
      executeControlledProductionMigrations({
        client,
        env,
        executionNonce: "nonce-exec-ready",
        dryRun: true,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records.length).toBeGreaterThan(0);
  });

  it("fails closed when inventory evidence is missing", async () => {
    const env = fullPhaseBEnv("nonce-missing-inv", false);
    env.ABRAXAS_DATABASE_URL = dbUrl;
    env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;

    await expect(
      withAbraxasPgTransaction(async (client) =>
        executeControlledProductionMigrations({
          client,
          env,
          executionNonce: "nonce-missing-inv",
          dryRun: true,
        }),
      ),
    ).rejects.toBeInstanceOf(ProductionMigrationGateError);
  });

  it("rolls back first migration when second statement fails", async () => {
    const table = "abx_b581_exec_rollback";
    await expect(
      withAbraxasPgTransaction(async (client) =>
        executeMigrationPlanWithAdvisoryLock({
          client,
          plan: [
            { file: "step_ok.sql", sha256: "a".repeat(64), sql: `create table public.${table}(id int)` },
            { file: "step_fail.sql", sha256: "b".repeat(64), sql: "select * from public.abx_exec_fail_missing" },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(ProductionMigrationStepError);

    const exists = execFileSync(
      "psql",
      [dbUrl, "-t", "-A", "-c", `select to_regclass('public.${table}') is not null;`],
      { encoding: "utf8" },
    ).trim();
    expect(exists).toBe("f");
  });
});

describe("Build #581 gate failure mapping", () => {
  it("maps gate errors for operator surfaces", () => {
    const mapped = migrationExecutorErrorToResult(
      new ProductionMigrationGateError("execution_nonce_mismatch", "Registered execution nonce mismatch."),
    );
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("execution_nonce_mismatch");
  });
});
