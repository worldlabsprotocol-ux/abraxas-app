#!/usr/bin/env npx tsx
/**
 * Build #558 — persistent staging readiness (configuration + read-only probes).
 * Does NOT apply schema migrations or run disposable synthetic certification.
 */
import { performance } from "node:perf_hooks";
import { createRecoveryPgClient } from "../../lib/databaseRecovery/pgClient";
import { probeRecoveryInventoryReady } from "../../lib/databaseRecovery/pgInventory";
import {
  SOVEREIGN_RUNTIME_SCHEMA_VERSION,
  sovereignRuntimeSchemaFingerprint,
} from "../../lib/sovereignRuntime/sovereignStagingConstants";
import { validateStagingPersistentEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";

async function main(): Promise<void> {
  const env = { ...process.env };
  const t0 = performance.now();

  const readiness = validateStagingPersistentEnv(env);
  if (!readiness.ok) {
    console.error(
      JSON.stringify(
        {
          build: 558,
          tier: "BLOCKED",
          staging: readiness,
          schema_version: SOVEREIGN_RUNTIME_SCHEMA_VERSION,
          schema_fingerprint_sha256: sovereignRuntimeSchemaFingerprint(),
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

  const httpBase = env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim();
  const activationOk = readiness.ok && inventoryReady && !inventoryError;

  console.log(
    JSON.stringify(
      {
        build: 558,
        tier: activationOk ? "STAGING_PERSISTENT_READY" : "BLOCKED",
        elapsed_ms: Math.round(performance.now() - t0),
        schema_version: SOVEREIGN_RUNTIME_SCHEMA_VERSION,
        schema_fingerprint_sha256: sovereignRuntimeSchemaFingerprint(),
        staging: readiness,
        read_only_probe: {
          recovery_inventory_ready: inventoryReady,
          error: inventoryError,
        },
        observed_http_certification: {
          configured: Boolean(httpBase),
          base_url_set: Boolean(httpBase),
          note: httpBase
            ? "Run npm run sovereign-runtime:observe-staging-http-558 after deploy."
            : "Set ABRAXAS_STAGING_HTTP_BASE_URL for observed HTTP certification.",
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
