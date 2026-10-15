// FILE: lib/passport/build582/productionActivationBoundary.ts
// Build #582: tiered Production activation truth (no implied migration or issuance).

import { evaluateProductionMigration581 } from "@/lib/passport/productionMigration581";
import { loadProductionPreflightEvidence } from "@/lib/passport/productionPreflightEvidence";
import { loadProductionReconciliationInventoryEvidence } from "@/lib/passport/productionReconciliationInventoryEvidence";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";

export const BUILD_582_CANONICAL_PRODUCT_URL = "https://abraxasworld.xyz" as const;

export type ActivationEvidenceTier =
  | "implemented_local"
  | "disposable_postgres"
  | "institutional_sandbox"
  | "deployed_live_app"
  | "production_infrastructure_verified"
  | "founder_authorization_blocked";

export type ProductionActivationBlocker = {
  code: string;
  detail: string;
  tier: ActivationEvidenceTier;
};

export type ProductionActivationBoundaryReport = {
  build: 582;
  canonical_product_url: typeof BUILD_582_CANONICAL_PRODUCT_URL;
  production_supabase_project_ref: typeof PRODUCTION_SUPABASE_PROJECT_REF;
  tiers: Record<ActivationEvidenceTier, string>;
  blockers: ProductionActivationBlocker[];
  migrations_136_143_applied_in_production: "unknown_without_founder_readonly_probe" | "blocked_by_gates";
  passport_issuer_signing_in_production: "blocked_pending_founder_authorization";
  holder_backfill_in_production: "blocked_pending_founder_authorization";
  institutional_sandbox_partner_flow: "available_without_founder";
  passport_institutional_presentation_live: "sandbox_disposable_pg_and_staging_gates_only";
};

const TIER_COPY: Record<ActivationEvidenceTier, string> = {
  implemented_local: "Repository logic and automated tests pass locally.",
  disposable_postgres: "Sovereign Passport and partner flows proven on disposable PostgreSQL.",
  institutional_sandbox: "Launchpad sandbox, hosted verification, and server receipt verify without Production DDL.",
  deployed_live_app: "Application deployed at the canonical product URL (UI and sandbox APIs).",
  production_infrastructure_verified: "Read-only probes confirm Production database identity and schema gates.",
  founder_authorization_blocked: "Founder explicit authorization required before DDL, backfill, hybrid PG, signing, or paid IDV.",
};

export function buildProductionActivationBoundaryReport(
  env: Record<string, string | undefined> = process.env,
): ProductionActivationBoundaryReport {
  const blockers: ProductionActivationBlocker[] = [];

  blockers.push({
    code: "production_ddl",
    detail: "Migrations 136 through 143 must not run without founder authorization and Build #581 Phase B gates.",
    tier: "founder_authorization_blocked",
  });
  blockers.push({
    code: "issuer_signing_production",
    detail: "Live issuer backed credential signing remains disabled in Production until explicitly authorized.",
    tier: "founder_authorization_blocked",
  });

  const preflight = loadProductionPreflightEvidence(env);
  if (!preflight.ok) {
    blockers.push({
      code: preflight.code,
      detail: preflight.detail,
      tier: "production_infrastructure_verified",
    });
  } else if (preflight.evidence.stale) {
    blockers.push({
      code: "preflight_stale",
      detail: "Refresh read-only Production preflight before trusting schema state.",
      tier: "production_infrastructure_verified",
    });
  }

  const inventory = preflight.ok ? loadProductionReconciliationInventoryEvidence(env) : null;
  if (preflight.ok && (!inventory || !inventory.ok)) {
    blockers.push({
      code: inventory?.code ?? "inventory_missing",
      detail: inventory?.detail ?? "Reconciliation inventory evidence missing.",
      tier: "production_infrastructure_verified",
    });
  } else if (inventory?.ok && inventory.evidence.stale) {
    blockers.push({
      code: "inventory_stale",
      detail: "Refresh read-only reconciliation inventory before holder backfill planning.",
      tier: "production_infrastructure_verified",
    });
  }

  if (preflight.ok && inventory?.ok) {
    const evaluation = evaluateProductionMigration581({
      preflight: preflight.evidence.report,
      preflightEvidence: preflight.evidence,
      env,
      verifiedDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      reconciliationInventory: inventory.evidence.inventory,
      reconciliationInventoryEvidence: { stale: inventory.evidence.stale },
    });
    if (evaluation.production_execution_blocked) {
      blockers.push({
        code: "phase_b_blocked",
        detail: evaluation.gates.find((g) => g.status === "blocked" || g.status === "fail")?.detail
          ?? "Phase B migration execution remains blocked.",
        tier: "founder_authorization_blocked",
      });
    }
  }

  return {
    build: 582,
    canonical_product_url: BUILD_582_CANONICAL_PRODUCT_URL,
    production_supabase_project_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    tiers: TIER_COPY,
    blockers,
    migrations_136_143_applied_in_production: "blocked_by_gates",
    passport_issuer_signing_in_production: "blocked_pending_founder_authorization",
    holder_backfill_in_production: "blocked_pending_founder_authorization",
    institutional_sandbox_partner_flow: "available_without_founder",
    passport_institutional_presentation_live: "sandbox_disposable_pg_and_staging_gates_only",
  };
}
