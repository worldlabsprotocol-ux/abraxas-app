#!/usr/bin/env npx tsx
// FILE: scripts/sovereign-runtime/disposable-proof.ts
// Disposable Abraxas-operated PostgreSQL proof (no Supabase PostgREST).

import { performance } from "node:perf_hooks";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWallet } from "@/lib/auth/holderSubject/service";
import { chainNeutralIdentitySchemaReadyServer } from "@/lib/persistence/chainNeutralSchemaReady.server";
import { persistenceUsesDirectPostgres, resolvePersistenceConfig } from "@/lib/persistence/env";
import { probeRecoveryInventoryReady } from "@/lib/databaseRecovery/pgInventory";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";

async function main(): Promise<void> {
  const env = process.env;
  if (!persistenceUsesDirectPostgres(env)) {
    throw new Error("Set ABRAXAS_PERSISTENCE_BACKEND=postgres_direct");
  }
  const cfg = resolvePersistenceConfig(env);
  if (!cfg.ok || cfg.backend !== "postgres_direct") {
    throw new Error("ABRAXAS_DATABASE_URL is required");
  }

  const t0 = performance.now();
  const schemaReady = await chainNeutralIdentitySchemaReadyServer(true);
  const caip = caip10Evm(11155111, `0x${"cc".repeat(20)}`);
  const identity = await resolveSubjectForVerifiedWallet({ caip, authMethod: "evm_wallet" });
  const receipt = verifyReceiptIndependently({
    expectations: { partnerId: "sovereign-proof", policyId: "proof" },
    env: {},
  });

  const url = cfg.databaseUrl;
  const client = await createRecoveryPgClient({ databaseUrl: url, env });
  let inventoryReady = false;
  try {
    inventoryReady = await probeRecoveryInventoryReady(client);
  } finally {
    await client.end();
  }

  const elapsedMs = Math.round(performance.now() - t0);

  console.log(JSON.stringify({
    ok: identity.ok && schemaReady,
    persistence_backend: "postgres_direct",
    schema_ready: schemaReady,
    holder_subject: identity.ok ? { subject_id: identity.subjectId, created: identity.created } : identity,
    receipt_offline_phases: receipt.phases.length,
    recovery_inventory_probe: inventoryReady,
    elapsed_ms: elapsedMs,
    note: inventoryReady
      ? "Recovery inventory tables present — eligible for Build #552 backup/restore on this database"
      : "Apply full demo schema before backup certification",
  }, null, 2));

  if (!identity.ok || !schemaReady) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
