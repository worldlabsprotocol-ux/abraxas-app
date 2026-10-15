#!/usr/bin/env npx tsx
// FILE: scripts/build-581/run-reconciliation-inventory.ts

import { queryHolderReconciliationInventory } from "@/lib/passport/productionHolderReconciliationInventory";
import {
  PRODUCTION_INVENTORY_ENVELOPE_BUILD,
  PRODUCTION_INVENTORY_ENVELOPE_VERSION,
  validateProductionReconciliationInventoryEnvelope,
} from "@/lib/passport/productionReconciliationInventoryEvidence";
import { loadProductionPreflightEvidence } from "@/lib/passport/productionPreflightEvidence";
import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";

async function main() {
  const url =
    process.env.ABRAXAS_PRODUCTION_READONLY_PG_URL?.trim()
    || process.env.ABRAXAS_PASSPORT_DATABASE_URL?.trim();
  if (!url) {
    console.log(JSON.stringify({ build: 581, status: "blocked", reason: "missing_readonly_database_url" }, null, 2));
    process.exit(2);
  }
  const derived = supabaseProjectRefFromPostgresUrl(url);
  if (derived !== PRODUCTION_SUPABASE_PROJECT_REF) {
    console.log(
      JSON.stringify(
        { build: 581, status: "blocked", reason: "database_identity_mismatch", derived_ref: derived },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const preflight = loadProductionPreflightEvidence(process.env);
  if (!preflight.ok) {
    console.log(
      JSON.stringify(
        {
          build: 581,
          status: "blocked",
          code: preflight.code,
          detail: "Load valid preflight evidence before capturing reconciliation inventory.",
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  process.env.ABRAXAS_DATABASE_URL = url;
  process.env.ABRAXAS_PASSPORT_DATABASE_URL = url;
  process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";

  const inventory = await withAbraxasPgTransaction(async (client) =>
    queryHolderReconciliationInventory(client),
  );

  const linkedPreflightCapturedAt =
    (preflight.evidence.report as { captured_at?: string }).captured_at?.trim()
    ?? new Date(preflight.evidence.capturedAtMs).toISOString();

  const envelope = {
    build: PRODUCTION_INVENTORY_ENVELOPE_BUILD,
    envelope_version: PRODUCTION_INVENTORY_ENVELOPE_VERSION,
    status: "ok" as const,
    capture_status: "complete" as const,
    generated_at: new Date().toISOString(),
    expected_production_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    derived_database_ref: derived,
    linked_preflight_captured_at: linkedPreflightCapturedAt,
    inventory,
  };

  const validated = validateProductionReconciliationInventoryEnvelope(envelope);
  if (!validated.ok) {
    console.log(JSON.stringify({ ...envelope, status: "invalid_envelope", validation: validated }, null, 2));
    process.exit(2);
  }

  console.log(JSON.stringify(envelope, null, 2));
}

main().catch((error) => {
  console.log(
    JSON.stringify(
      { build: 581, status: "blocked", code: error instanceof Error ? error.message : "inventory_failed" },
      null,
      2,
    ),
  );
  process.exit(2);
});
