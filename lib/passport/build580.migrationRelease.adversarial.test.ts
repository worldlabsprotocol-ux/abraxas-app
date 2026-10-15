// FILE: lib/passport/build580.migrationRelease.adversarial.test.ts

import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  evaluateProductionMigrationRelease,
  isProductionPreflightReportComplete,
} from "./productionMigrationRelease";

const completePreflight = {
  build: 580,
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

describe("Build #580 migration release adversarial gates", () => {
  it("rejects forged self-declared project ref without verified binding", () => {
    const evaluation = evaluateProductionMigrationRelease({
      preflight: { ...completePreflight, project_ref_expected: "fake-ref" },
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    });
    expect(evaluation.gates.some((g) => g.gate === "forged_project_reference" && g.status === "fail")).toBe(true);
    expect(evaluation.production_execution_blocked).toBe(true);
  });

  it("does not verify database identity from preflight project_ref_expected alone", () => {
    const evaluation = evaluateProductionMigrationRelease({
      preflight: completePreflight,
      verifiedDatabaseProjectRef: null,
    });
    expect(evaluation.gates.find((g) => g.gate === "database_identity")?.status).toBe("fail");
  });

  it("fails when preflight sections are missing", () => {
    expect(isProductionPreflightReportComplete({ build: 580 })).toBe(false);
    const evaluation = evaluateProductionMigrationRelease({
      preflight: { build: 580, project_ref_expected: PRODUCTION_SUPABASE_PROJECT_REF },
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    });
    expect(evaluation.dry_run_preflight_ok).toBe(false);
  });

  it("detects partial migration drift", () => {
    const evaluation = evaluateProductionMigrationRelease({
      preflight: {
        ...completePreflight,
        prerequisites: { ...completePreflight.prerequisites, passport_holder_subjects: true },
      },
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    });
    expect(evaluation.schema_drift_detected).toBe(true);
    expect(evaluation.production_execution_blocked).toBe(true);
  });

  it("keeps execution blocked when founder token contradicts backup attestation", () => {
    const evaluation = evaluateProductionMigrationRelease({
      preflight: completePreflight,
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      env: {
        ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED: "true",
        ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_ACK_ID: "ack-12345678",
        ABRAXAS_PRODUCTION_MIGRATION_RELEASE_TOKEN: "wrong-token",
      },
    });
    expect(evaluation.production_execution_blocked).toBe(true);
  });
});
