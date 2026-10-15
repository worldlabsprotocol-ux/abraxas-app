// FILE: lib/passport/build580.migrationRelease.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  SOVEREIGN_PASSPORT_MIGRATION_FILES,
  evaluateProductionMigrationRelease,
} from "./productionMigrationRelease";
import { filterOperatorApprovedPlanRows } from "./holderIdentityReconciliationExecution";
import { planLegacyIdentityBackfill, LEGACY_KIND_SUI_ADDRESS } from "./holderIdentityReconciliation";

const SUI = "0x" + "1".repeat(64);

const completePreflight = {
  build: 580,
  project_ref_expected: PRODUCTION_SUPABASE_PROJECT_REF,
  public_table_count: 122,
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

describe("Build #580 migration release gates", () => {
  it("includes ordered migration filenames 136 through 143", () => {
    expect(SOVEREIGN_PASSPORT_MIGRATION_FILES).toHaveLength(8);
    expect(SOVEREIGN_PASSPORT_MIGRATION_FILES[0]).toBe("136_passport_holder_subjects.sql");
    expect(SOVEREIGN_PASSPORT_MIGRATION_FILES[7]).toBe("143_passport_authorization_signing_claim.sql");
  });

  it("blocks Production execution without backup and founder tokens", () => {
    const evaluation = evaluateProductionMigrationRelease({
      preflight: completePreflight,
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      env: {},
    });
    expect(evaluation.production_execution_blocked).toBe(true);
    expect(evaluation.dry_run_preflight_ok).toBe(true);
    expect(evaluation.migration_apply_pending).toBe(true);
  });

  it("fails closed on partial migration drift", () => {
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

  it("does not arm execution from a single authorization flag alone", () => {
    const evaluation = evaluateProductionMigrationRelease({
      preflight: completePreflight,
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      env: {
        ABRAXAS_FOUNDER_PRODUCTION_MIGRATION_AUTHORIZED: "true",
      },
    });
    expect(evaluation.production_execution_blocked).toBe(true);
  });

  it("release gates SQL references Build #580 and project ref", () => {
    const sql = readFileSync(
      join(process.cwd(), "scripts/build-580/production-migration-release-gates.sql"),
      "utf8",
    );
    expect(sql).toContain("580");
    expect(sql).toContain(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(sql).toContain("136_passport_holder_subjects.sql");
  });
});

describe("Build #580 reconciliation execution filters", () => {
  it("filters operator-approved plan rows only", () => {
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" }],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const filtered = filterOperatorApprovedPlanRows(plan.rows);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.action !== "block_unverified_wallet")).toBe(true);
  });
});
