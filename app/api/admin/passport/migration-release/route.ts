// FILE: app/api/admin/passport/migration-release/route.ts
// Operator read-only migration release gate summary (no DDL, no holder row access).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import {
  PRODUCTION_RELEASE_SEQUENCE,
  PRODUCTION_SUPABASE_PROJECT_REF,
  SOVEREIGN_PASSPORT_MIGRATION_FILES,
  evaluateProductionMigrationRelease,
} from "@/lib/passport/productionMigrationRelease";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const evaluation = evaluateProductionMigrationRelease({
    preflight: {
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
    },
    verifiedDatabaseProjectRef: process.env.ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF ?? null,
    env: process.env,
  });

  return NextResponse.json(
    {
      build: 580,
      production_project_ref: PRODUCTION_SUPABASE_PROJECT_REF,
      migration_files: SOVEREIGN_PASSPORT_MIGRATION_FILES,
      release_sequence: PRODUCTION_RELEASE_SEQUENCE,
      evaluation,
      operator_actions: [
        "Run scripts/build-580/production-migration-release-gates.sql on Production (read only) and store JSON.",
        "Reconcile partial schema drift before any DDL.",
        "Record backup checkpoint and restore test attestation env vars.",
        "Review holder reconciliation dry-run audits before execute mode.",
      ],
      sql_probes: [
        "scripts/build-578/production-schema-probes.sql",
        "scripts/build-579/production-migration-preflight.sql",
        "scripts/build-580/production-migration-release-gates.sql",
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
