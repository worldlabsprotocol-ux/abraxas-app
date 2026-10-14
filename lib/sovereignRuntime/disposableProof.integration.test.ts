/**
 * CLI-safe disposable sovereign proof (vitest runner avoids server-only tsx import issues).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { chainNeutralIdentitySchemaReadyDirect } from "@/lib/persistence/chainNeutralSchemaDirect";
import { persistenceUsesDirectPostgres, resolvePersistenceConfig } from "@/lib/persistence/env";
import { probeRecoveryInventoryReady } from "@/lib/databaseRecovery/pgInventory";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";

const PG = process.env.ABRAXAS_DATABASE_URL?.trim();

describe("sovereign disposable proof", () => {
  if (!PG || !persistenceUsesDirectPostgres()) {
    it.skip("requires ABRAXAS_PERSISTENCE_BACKEND=postgres_direct and ABRAXAS_DATABASE_URL", () => {});
    return;
  }

  it("proves holder subject, schema, inventory, and offline receipt phases", async () => {
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG;
    resetAbraxasPgPoolForTests();

    const cfg = resolvePersistenceConfig(process.env);
    expect(cfg.ok).toBe(true);

    const schemaReady = await chainNeutralIdentitySchemaReadyDirect();
    const wallet = `0x${randomBytes(20).toString("hex")}`;
    const identity = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, wallet),
      authMethod: "evm_wallet",
    });
    const receipt = verifyReceiptIndependently({
      expectations: { partnerId: "sovereign-proof", policyId: "proof" },
      env: {},
    });

    const client = await createRecoveryPgClient({ databaseUrl: PG!, env: process.env });
    let inventoryReady = false;
    try {
      inventoryReady = await probeRecoveryInventoryReady(client);
    } finally {
      await client.end();
    }

    expect(schemaReady).toBe(true);
    expect(identity.ok).toBe(true);
    expect(receipt.phases.length).toBeGreaterThan(0);
    expect(inventoryReady).toBe(true);

    console.info(
      JSON.stringify({
        ok: true,
        persistence_backend: "postgres_direct",
        schema_ready: schemaReady,
        recovery_inventory_probe: inventoryReady,
        receipt_offline_phases: receipt.phases.length,
      }),
    );
  });
});
