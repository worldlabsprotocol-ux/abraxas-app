// FILE: lib/passport/build581.migrationExecution.test.ts

import { describe, expect, it } from "vitest";
import { buildTestPreflightEnvelope } from "./productionPreflightEnvelope";
import { loadProductionPreflightEvidence } from "./productionPreflightEvidence";
import {
  evaluateProductionMigration581,
  PRODUCTION_MIGRATION_EXECUTE_TOKEN,
  verifyProductionDdlExecutionAuthorization,
} from "./productionMigration581";
import { buildMigrationExecutionPlan } from "./productionMigrationExecutor";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";

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

describe("Build #581 Production migration execution boundary", () => {
  it("loads validated preflight envelope from inline env", () => {
    const loaded = loadProductionPreflightEvidence({
      ABRAXAS_PRODUCTION_PREFLIGHT_JSON: JSON.stringify(validEnvelope),
      ABRAXAS_PRODUCTION_PREFLIGHT_MAX_AGE_HOURS: "24",
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.evidence.stale).toBe(false);
  });

  it("blocks Phase B without DDL authorization env", () => {
    const auth = verifyProductionDdlExecutionAuthorization({
      ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED: "true",
      ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID: "founder-ack-12345678",
      ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN: PRODUCTION_MIGRATION_EXECUTE_TOKEN,
    });
    expect(auth.ok).toBe(false);
    expect(auth.code).toBe("ddl_not_authorized");
  });

  it("requires Build #581 execute token for Phase B", () => {
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
      env: {
        ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED: "true",
        ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID: "founder-ack-12345678",
        ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN: PRODUCTION_MIGRATION_EXECUTE_TOKEN,
        ABRAXAS_PRODUCTION_MIGRATION_DDL_AUTHORIZED: "true",
        ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ID: "op-prod-581",
        ABRAXAS_OPERATOR_PRODUCTION_MIGRATION_ACK: "op-prod-581",
        ABRAXAS_FOUNDER_BACKUP_CHECKPOINT_ID: "chk-123",
        ABRAXAS_FOUNDER_BACKUP_RESTORE_TESTED: "true",
        ABRAXAS_PRODUCTION_MIGRATION_REHEARSAL_ATTESTED: "true",
        ABRAXAS_PRODUCTION_MIGRATION_EXECUTION_NONCE: "nonce-test",
      },
      reconciliationInventory: {
        captured_at: new Date().toISOString(),
        approved_sui_idv_eligible: 3,
        pending_review_idv: 1,
        rejected_or_expired_idv: 0,
        idv_with_canonical_subject: 0,
        verified_wallet_bindings: null,
        legacy_links_present: null,
        canonical_subjects_present: null,
        sui_unlinked_not_approved: 0,
        approved_unlinked_needs_reconciliation: 3,
        zklogin_continuity_records: null,
        ambiguous_mapping_blocked: 0,
      },
    });
    expect(evaluation.build).toBe(581);
    expect(evaluation.phase).toBe("B_execution_ready");
    expect(evaluation.production_execution_blocked).toBe(false);
  });

  it("builds migration plan with stable checksums for 136–143", () => {
    const plan = buildMigrationExecutionPlan();
    expect(plan).toHaveLength(8);
    expect(plan.every((step) => step.sha256.length === 64)).toBe(true);
  });
});
