// FILE: app/api/admin/passport/migration-release/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import {
  CANONICAL_PRODUCT_URL,
  evaluateProductionMigration581,
  FOUNDER_PHASE_B_APPROVALS,
  POSTMIGRATION_ACCEPTANCE_CHECKLIST,
  PRODUCTION_MIGRATION_EXECUTE_TOKEN,
} from "@/lib/passport/productionMigration581";
import { loadProductionPreflightEvidence } from "@/lib/passport/productionPreflightEvidence";
import {
  PRODUCTION_RELEASE_SEQUENCE,
  PRODUCTION_SUPABASE_PROJECT_REF,
  SOVEREIGN_PASSPORT_MIGRATION_FILES,
} from "@/lib/passport/productionMigrationRelease";
import { validatePassportHybridPostgresBinding } from "@/lib/persistence/passportHybridPostgres";

export const dynamic = "force-dynamic";

const PLACEHOLDER_PREFLIGHT = {
  build: 580,
  project_ref_expected: PRODUCTION_SUPABASE_PROJECT_REF,
  public_table_count: 0,
  prerequisites: {},
  migrations_140_143: {},
  legacy_identity_columns: {},
};

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const preflightLoaded = loadProductionPreflightEvidence(process.env);
  const hybridBinding = validatePassportHybridPostgresBinding({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      || `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
  });

  const verifiedRef =
    hybridBinding.ok && hybridBinding.binding_mode === "supabase_dual_identity"
      ? hybridBinding.direct_project_ref
      : process.env.ABRAXAS_VERIFIED_SUPABASE_PROJECT_REF?.trim() ?? null;

  const evaluation = evaluateProductionMigration581({
    preflight: preflightLoaded.ok ? preflightLoaded.evidence.report : PLACEHOLDER_PREFLIGHT,
    preflightEvidence: preflightLoaded.ok ? preflightLoaded.evidence : null,
    verifiedDatabaseProjectRef: verifiedRef,
    env: process.env,
    reconciliationInventory: null,
  });

  return NextResponse.json(
    {
      build: 581,
      canonical_product_url: CANONICAL_PRODUCT_URL,
      production_project_ref: PRODUCTION_SUPABASE_PROJECT_REF,
      migration_files: SOVEREIGN_PASSPORT_MIGRATION_FILES,
      release_sequence: PRODUCTION_RELEASE_SEQUENCE,
      phase_b_execute_token: PRODUCTION_MIGRATION_EXECUTE_TOKEN,
      evaluation,
      preflight: preflightLoaded.ok
        ? {
            source: preflightLoaded.evidence.source,
            captured_at_ms: preflightLoaded.evidence.capturedAtMs,
            age_hours: preflightLoaded.evidence.ageHours,
            stale: preflightLoaded.evidence.stale,
          }
        : { status: "missing", detail: preflightLoaded.ok ? null : preflightLoaded.detail },
      database_binding: hybridBinding.ok
        ? {
            mode: hybridBinding.binding_mode,
            direct_project_ref: hybridBinding.direct_project_ref,
            postgrest_project_ref: hybridBinding.postgrest_project_ref,
          }
        : { ok: false, code: hybridBinding.ok ? null : hybridBinding.code },
      postmigration_acceptance: POSTMIGRATION_ACCEPTANCE_CHECKLIST,
      founder_phase_b_approvals: FOUNDER_PHASE_B_APPROVALS,
      operator_commands: [
        "npm run build-581:production-readonly-preflight > preflight.json",
        "export ABRAXAS_PRODUCTION_PREFLIGHT_JSON_PATH=./preflight.json",
        "npm run build-581:migration-rehearsal",
        "npm run build-581:reconciliation-inventory (after read-only URL configured)",
        "Phase B only: npm run build-581:controlled-migration -- <single_use_nonce>",
      ],
      sql_probes: [
        "scripts/build-578/production-schema-probes.sql",
        "scripts/build-579/production-migration-preflight.sql",
        "scripts/build-580/production-migration-release-gates.sql",
      ],
      production_read_access: preflightLoaded.ok
        ? "preflight_loaded"
        : "blocked_supply_ABRAXAS_PRODUCTION_READONLY_PG_URL_and_store_preflight_JSON",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
