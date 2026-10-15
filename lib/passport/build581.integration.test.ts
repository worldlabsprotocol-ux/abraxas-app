// FILE: lib/passport/build581.integration.test.ts

import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evaluateDisposablePgMigrationTestGuard } from "@/lib/persistence/disposablePgMigrationTestGuard";
import { resetAbraxasPgPoolForTests, withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { PRODUCTION_MIGRATION_RECONCILE_TOKEN } from "./productionMigrationRelease";
import {
  buildTestPreflightEnvelope,
  validateProductionPreflightEnvelope,
} from "./productionPreflightEnvelope";
import { loadProductionPreflightEvidence } from "./productionPreflightEvidence";
import {
  evaluateProductionMigration581,
  PRODUCTION_MIGRATION_EXECUTE_TOKEN,
  verifyProductionMigrationExecutionNonce,
} from "./productionMigration581";
import {
  executeMigrationPlanWithAdvisoryLock,
  ProductionMigrationStepError,
  migrationExecutorErrorToResult,
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

const validEnvelope = buildTestPreflightEnvelope(probe580Report);

function phaseBEnv(nonce: string): Record<string, string> {
  return {
    ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(validEnvelope),
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
  };
}

describe("Build #581 preflight envelope contract", () => {
  it("loads real probe envelope through loader and evaluator", () => {
    const loaded = loadProductionPreflightEvidence({
      ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(validEnvelope),
      ABRAXAS_PRODUCTION_PREFLIGHT_MAX_AGE_HOURS: "24",
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const evaluation = evaluateProductionMigration581({
      preflight: loaded.evidence.report,
      preflightEvidence: loaded.evidence,
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      env: phaseBEnv("nonce-eval-1"),
      reconciliationInventory: {
        captured_at: new Date().toISOString(),
        approved_sui_idv_eligible: 1,
        pending_review_idv: 0,
        rejected_or_expired_idv: 0,
        idv_with_canonical_subject: 0,
        verified_wallet_bindings: null,
        legacy_links_present: null,
        canonical_subjects_present: null,
        sui_unlinked_not_approved: 0,
        approved_unlinked_needs_reconciliation: 1,
        zklogin_continuity_records: null,
        ambiguous_mapping_blocked: 0,
      },
    });
    expect(evaluation.phase).toBe("B_execution_ready");
  });

  it("rejects unrelated JSON with only a fresh timestamp", () => {
    const forged = { captured_at: new Date().toISOString(), prerequisites: {}, migrations_140_143: {} };
    const validated = validateProductionPreflightEnvelope(forged);
    expect(validated.ok).toBe(false);
    const loaded = loadProductionPreflightEvidence({
      ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(forged),
    });
    expect(loaded.ok).toBe(false);
  });

  it("rejects stale preflight evidence", () => {
    const staleProbe = {
      ...probe580Report,
      captured_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    };
    const envelope = buildTestPreflightEnvelope(staleProbe);
    const loaded = loadProductionPreflightEvidence({
      ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(envelope),
      ABRAXAS_PRODUCTION_PREFLIGHT_MAX_AGE_HOURS: "6",
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.evidence.stale).toBe(true);
  });
});

describe("Build #581 authorization contracts", () => {
  it("allows Phase B ready with Build #581 execute token while Build #580 uses reconcile token", () => {
    const evaluation = evaluateProductionMigration581({
      preflight: probe580Report,
      preflightEvidence: {
        report: probe580Report,
        capturedAtMs: Date.now(),
        source: "inline_env",
        ageHours: 0,
        stale: false,
        derivedDatabaseRef: PRODUCTION_SUPABASE_PROJECT_REF,
      },
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      env: phaseBEnv("nonce-ready"),
      reconciliationInventory: {
        captured_at: new Date().toISOString(),
        approved_sui_idv_eligible: 1,
        pending_review_idv: 0,
        rejected_or_expired_idv: 0,
        idv_with_canonical_subject: 0,
        verified_wallet_bindings: null,
        legacy_links_present: null,
        canonical_subjects_present: null,
        sui_unlinked_not_approved: 0,
        approved_unlinked_needs_reconciliation: 1,
        zklogin_continuity_records: null,
        ambiguous_mapping_blocked: 0,
      },
    });
    expect(evaluation.phase).toBe("B_execution_ready");
    expect(evaluation.production_execution_blocked).toBe(false);
  });

  it("fails closed when only Build #580 reconcile token is configured", () => {
    const env = phaseBEnv("nonce-580-only");
    env.ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN = PRODUCTION_MIGRATION_RECONCILE_TOKEN;
    const evaluation = evaluateProductionMigration581({
      preflight: probe580Report,
      preflightEvidence: {
        report: probe580Report,
        capturedAtMs: Date.now(),
        source: "inline_env",
        ageHours: 0,
        stale: false,
        derivedDatabaseRef: PRODUCTION_SUPABASE_PROJECT_REF,
      },
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      env,
      reconciliationInventory: {
        captured_at: new Date().toISOString(),
        approved_sui_idv_eligible: 1,
        pending_review_idv: 0,
        rejected_or_expired_idv: 0,
        idv_with_canonical_subject: 0,
        verified_wallet_bindings: null,
        legacy_links_present: null,
        canonical_subjects_present: null,
        sui_unlinked_not_approved: 0,
        approved_unlinked_needs_reconciliation: 1,
        zklogin_continuity_records: null,
        ambiguous_mapping_blocked: 0,
      },
    });
    expect(evaluation.phase).not.toBe("B_execution_ready");
  });

  it("rejects incorrect execution nonce", () => {
    const check = verifyProductionMigrationExecutionNonce(phaseBEnv("expected-nonce"), "wrong-nonce");
    expect(check.ok).toBe(false);
  });

  it("blocks Phase B when database identity is unverified", () => {
    const evaluation = evaluateProductionMigration581({
      preflight: probe580Report,
      preflightEvidence: {
        report: probe580Report,
        capturedAtMs: Date.now(),
        source: "inline_env",
        ageHours: 0,
        stale: false,
        derivedDatabaseRef: PRODUCTION_SUPABASE_PROJECT_REF,
      },
      verifiedDatabaseProjectRef: null,
      env: phaseBEnv("nonce-unverified-db"),
      reconciliationInventory: {
        captured_at: new Date().toISOString(),
        approved_sui_idv_eligible: 1,
        pending_review_idv: 0,
        rejected_or_expired_idv: 0,
        idv_with_canonical_subject: 0,
        verified_wallet_bindings: null,
        legacy_links_present: null,
        canonical_subjects_present: null,
        sui_unlinked_not_approved: 0,
        approved_unlinked_needs_reconciliation: 1,
        zklogin_continuity_records: null,
        ambiguous_mapping_blocked: 0,
      },
    });
    expect(evaluation.phase).not.toBe("B_execution_ready");
    expect(evaluation.production_execution_blocked).toBe(true);
  });
});

describe.skipIf(!canRunDisposable)("Build #581 migration transaction rollback", () => {
  const DB = `abx_b581_rb_${Date.now()}`;
  let dbUrl: string;

  beforeAll(() => {
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${DB}"`]);
    dbUrl = PG_URL!.replace(/\/[^/]+$/, `/${DB}`);
    process.env.ABRAXAS_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED = "true";
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_URL = dbUrl;
    resetAbraxasPgPoolForTests();
  });

  afterAll(() => {
    resetAbraxasPgPoolForTests();
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${DB}" with (force)`]);
  });

  it("rolls back earlier DDL when a later migration statement fails", async () => {
    const table = "abx_b581_rollback_probe";
    await expect(
      withAbraxasPgTransaction(async (client) =>
        executeMigrationPlanWithAdvisoryLock({
          client,
          plan: [
            { file: "step_ok.sql", sha256: "a".repeat(64), sql: `create table public.${table}(id int)` },
            { file: "step_fail.sql", sha256: "b".repeat(64), sql: "select * from public.abx_nonexistent_migration_fail" },
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

  it("maps step errors to sanitized executor results without reporting durable apply", () => {
    const err = new ProductionMigrationStepError({
      failedFile: "step_fail.sql",
      failedSha256: "c".repeat(64),
      sanitizedDetail: "relation does not exist",
      attemptedRecords: [{ file: "step_ok.sql", sha256: "d".repeat(64), outcome: "applied" }],
    });
    const mapped = migrationExecutorErrorToResult(err);
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.failed_file).toBe("step_fail.sql");
    expect(mapped.code).toBe("migration_step_failed");
  });
});
