// FILE: lib/passport/productionMigrationReleaseContext.ts

import type { PoolClient } from "pg";
import { evaluateProductionMigration581, type ProductionMigration581Evaluation } from "./productionMigration581";
import { loadProductionPreflightEvidence, type LoadedProductionPreflight } from "./productionPreflightEvidence";
import {
  loadProductionReconciliationInventoryEvidence,
  type LoadedReconciliationInventoryEvidence,
} from "./productionReconciliationInventoryEvidence";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";
import { assertReconciliationDatabaseBinding, type ReconciliationDatabaseBinding } from "./reconciliationDatabaseBinding";

export type ProductionMigrationReleaseContext =
  | {
      ok: true;
      preflight: LoadedProductionPreflight;
      inventory: LoadedReconciliationInventoryEvidence;
      binding: Extract<ReconciliationDatabaseBinding, { ok: true }>;
      evaluation: ProductionMigration581Evaluation;
      verifiedDatabaseProjectRef: string;
    }
  | { ok: false; code: string; detail: string };

export async function resolveProductionMigrationReleaseContext(input: {
  env?: Record<string, string | undefined>;
  client: PoolClient;
}): Promise<ProductionMigrationReleaseContext> {
  const env = input.env ?? process.env;
  const preflightLoaded = loadProductionPreflightEvidence(env);
  if (!preflightLoaded.ok) {
    return { ok: false, code: preflightLoaded.code, detail: preflightLoaded.detail };
  }
  if (preflightLoaded.evidence.stale) {
    return { ok: false, code: "preflight_stale", detail: "Preflight evidence is stale." };
  }

  const inventoryLoaded = loadProductionReconciliationInventoryEvidence(env);
  if (!inventoryLoaded.ok) {
    return { ok: false, code: inventoryLoaded.code, detail: inventoryLoaded.detail };
  }
  if (inventoryLoaded.evidence.stale) {
    return { ok: false, code: "inventory_stale", detail: "Reconciliation inventory evidence is stale." };
  }

  const binding = await assertReconciliationDatabaseBinding({ client: input.client, env });
  if (!binding.ok) {
    return { ok: false, code: binding.code, detail: binding.detail };
  }
  if (binding.derivedProjectRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return {
      ok: false,
      code: "migration_target_mismatch",
      detail: "Active database identity is not Production project ref.",
    };
  }
  if (binding.derivedProjectRef !== preflightLoaded.evidence.derivedDatabaseRef) {
    return { ok: false, code: "binding_preflight_mismatch", detail: "Live binding disagrees with preflight database identity." };
  }
  if (binding.derivedProjectRef !== inventoryLoaded.evidence.derivedDatabaseRef) {
    return { ok: false, code: "binding_inventory_mismatch", detail: "Live binding disagrees with inventory database identity." };
  }

  const evaluation = evaluateProductionMigration581({
    preflight: preflightLoaded.evidence.report,
    preflightEvidence: preflightLoaded.evidence,
    env,
    verifiedDatabaseProjectRef: binding.derivedProjectRef,
    reconciliationInventory: inventoryLoaded.evidence.inventory,
  });

  return {
    ok: true,
    preflight: preflightLoaded.evidence,
    inventory: inventoryLoaded.evidence,
    binding,
    evaluation,
    verifiedDatabaseProjectRef: binding.derivedProjectRef,
  };
}
