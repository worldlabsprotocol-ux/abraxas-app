#!/usr/bin/env npx tsx
// FILE: scripts/build-581/run-reconciliation-inventory.ts

import { queryHolderReconciliationInventory } from "@/lib/passport/productionHolderReconciliationInventory";
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

  process.env.ABRAXAS_DATABASE_URL = url;
  process.env.ABRAXAS_PASSPORT_DATABASE_URL = url;
  process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";

  const inventory = await withAbraxasPgTransaction(async (client) =>
    queryHolderReconciliationInventory(client),
  );

  console.log(JSON.stringify({ build: 581, status: "ok", inventory }, null, 2));
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
