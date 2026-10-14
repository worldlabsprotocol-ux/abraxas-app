#!/usr/bin/env npx tsx
/**
 * Build #557 — institutional readiness gate (configuration + read-only probes).
 * Does NOT apply schema or run disposable synthetic IDV certification.
 */
import { performance } from "node:perf_hooks";
import { createRecoveryPgClient } from "../../lib/databaseRecovery/pgClient";
import { probeRecoveryInventoryReady } from "../../lib/databaseRecovery/pgInventory";
import { validateInstitutionalReadinessEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";

async function main(): Promise<void> {
  const env = { ...process.env };
  const t0 = performance.now();

  const readiness = validateInstitutionalReadinessEnv(env);
  if (!readiness.ok) {
    console.error(
      JSON.stringify(
        {
          build: 557,
          tier: "BLOCKED",
          institutional: readiness,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const databaseUrl = env.ABRAXAS_DATABASE_URL!.trim();
  let inventoryReady = false;
  let inventoryError: string | null = null;
  const client = await createRecoveryPgClient({ databaseUrl, env });
  try {
    inventoryReady = await probeRecoveryInventoryReady(client);
    if (!inventoryReady) {
      inventoryError = "recovery_inventory_incomplete";
    }
  } catch (error) {
    inventoryError = error instanceof Error ? error.message : String(error);
  } finally {
    await client.end();
  }

  const activationOk = readiness.ok && inventoryReady && !inventoryError;

  console.log(
    JSON.stringify(
      {
        build: 557,
        tier: activationOk ? "INSTITUTIONAL_READY" : "BLOCKED",
        elapsed_ms: Math.round(performance.now() - t0),
        institutional: readiness,
        read_only_probe: {
          recovery_inventory_ready: inventoryReady,
          error: inventoryError,
        },
        schema_mutations: false,
        disposable_certification_run: false,
        note: readiness.notes.join(" "),
      },
      null,
      2,
    ),
  );

  process.exit(activationOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
