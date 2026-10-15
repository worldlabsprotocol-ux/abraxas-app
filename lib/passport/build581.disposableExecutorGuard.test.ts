// FILE: lib/passport/build581.disposableExecutorGuard.test.ts

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { SOVEREIGN_DISPOSABLE_DATABASE_ID } from "@/lib/persistence/disposablePgTestEnv";
import { evaluateDisposablePgMigrationTestGuard } from "@/lib/persistence/disposablePgMigrationTestGuard";
import { resetAbraxasPgPoolForTests, withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { buildTestPreflightEnvelope } from "./productionPreflightEnvelope";
import { buildTestReconciliationInventoryEnvelope } from "./productionReconciliationInventoryEvidence";
import { executeControlledProductionMigrations, ProductionMigrationGateError } from "./productionMigrationExecutor";
import { PRODUCTION_MIGRATION_EXECUTE_TOKEN } from "./productionMigration581";
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

describe.skipIf(!canRunDisposable)("Build #581 executor disposable database guard", () => {
  const DB = `abx_b581_guard_${Date.now()}`;
  let dbUrl: string;

  beforeAll(() => {
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${DB}"`]);
    dbUrl = PG_URL!.replace(/\/[^/]+$/, `/${DB}`);
    process.env.ABRAXAS_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PASSPORT_DATABASE_URL = dbUrl;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID = SOVEREIGN_DISPOSABLE_DATABASE_ID;
    process.env.ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED = "true";
    process.env.ABRAXAS_DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED = "true";
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_URL = dbUrl;
    resetAbraxasPgPoolForTests();
  });

  afterAll(() => {
    resetAbraxasPgPoolForTests();
    const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${DB}" with (force)`]);
  });

  it("cannot target disposable database even when other gates are satisfied", async () => {
    const inventoryEnvelope = buildTestReconciliationInventoryEnvelope({
      linkedPreflightCapturedAt: probe580Report.captured_at,
      inventory: {
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

    const env: Record<string, string> = {
      ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(buildTestPreflightEnvelope(probe580Report)),
      ABRAXAS_PRODUCTION_RECONCILIATION_INVENTORY_JSON: JSON.stringify(inventoryEnvelope),
      ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED: "true",
      ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID: "founder-ack-12345678",
      ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN: PRODUCTION_MIGRATION_EXECUTE_TOKEN,
      ABRAXAS_PRODUCTION_MIGRATION_DDL_AUTHORIZED: "true",
      ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ID: "op-prod-581",
      ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ACK: "op-prod-581",
      ABRAXAS_FOUNDER_BACKUP_CHECKPOINT_ID: "chk-123",
      ABRAXAS_FOUNDER_BACKUP_RESTORE_TESTED: "true",
      ABRAXAS_PRODUCTION_MIGRATION_REHEARSAL_ATTESTED: "true",
      ABRAXAS_PRODUCTION_MIGRATION_EXECUTION_NONCE: "nonce-disposable-guard",
      ABRAXAS_DATABASE_URL: dbUrl,
      ABRAXAS_PASSPORT_DATABASE_URL: dbUrl,
    };

    await expect(
      withAbraxasPgTransaction(async (client) =>
        executeControlledProductionMigrations({
          client,
          env,
          executionNonce: "nonce-disposable-guard",
          dryRun: true,
        }),
      ),
    ).rejects.toBeInstanceOf(ProductionMigrationGateError);
  });
});
