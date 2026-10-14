#!/usr/bin/env npx tsx
/**
 * Build #558 — non-destructive restore drill to independent ABRAXAS_SOVEREIGN_RESTORE_PG_URL.
 */
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import {
  cleanupTempDump,
  restoreFromManifestFile,
  verifyRestoredSnapshot,
} from "@/lib/databaseRecovery/pipeline";
import { validateStagingPersistentEnv } from "@/lib/sovereignRuntime/sovereignActivationPolicy";

async function main(): Promise<void> {
  const env = process.env;
  const gate = validateStagingPersistentEnv(env);
  if (!gate.ok) {
    console.error(JSON.stringify({ build: 558, tier: "BLOCKED", staging: gate }, null, 2));
    process.exit(1);
  }

  const manifestPath = env.ABRAXAS_BACKUP_MANIFEST_PATH?.trim();
  const restoreUrl = env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL!.trim();
  const keyRaw = env.ABRAXAS_BACKUP_ENCRYPTION_KEY!.trim();

  if (!manifestPath) {
    console.error(
      JSON.stringify(
        {
          build: 558,
          tier: "BLOCKED",
          error: "ABRAXAS_BACKUP_MANIFEST_PATH is required",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const { tmpDump, manifest } = restoreFromManifestFile(manifestPath, restoreUrl, keyRaw, env);
  const client = await createRecoveryPgClient({ databaseUrl: restoreUrl, env });
  try {
    const verified = await verifyRestoredSnapshot(client, manifest);
    console.log(
      JSON.stringify(
        {
          build: 558,
          tier: "RESTORE_DRILL_VERIFIED",
          restore_target: "independent",
          inventory_hash_sha256: verified.inventoryHash,
          integrity_hash_sha256: verified.integrityHash,
          note: "Drill target only — primary staging database unchanged.",
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
    cleanupTempDump(tmpDump);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
