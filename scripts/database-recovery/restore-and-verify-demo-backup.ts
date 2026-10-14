#!/usr/bin/env npx tsx
// FILE: scripts/database-recovery/restore-and-verify-demo-backup.ts

import { appendBackupAuditLog } from "@/lib/databaseRecovery/auditLog";
import { assertDisposableRestoreTarget } from "@/lib/databaseRecovery/guard";
import {
  cleanupTempDump,
  restoreFromManifestFile,
  verifyRestoredSnapshot,
} from "@/lib/databaseRecovery/pipeline";
import { fetchRecoveryInventory } from "@/lib/databaseRecovery/pgInventory";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { redactDatabaseSecrets } from "@/scripts/demo/lib/demoDatabaseUrl";

async function main(): Promise<void> {
  const env = process.env;
  const manifestPath = env.ABRAXAS_BACKUP_MANIFEST_PATH?.trim();
  const restoreUrl = env.ABRAXAS_RESTORE_DATABASE_URL?.trim();
  const keyRaw = env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim();

  if (!manifestPath) throw new Error("ABRAXAS_BACKUP_MANIFEST_PATH is required");
  if (!restoreUrl) throw new Error("ABRAXAS_RESTORE_DATABASE_URL is required");
  if (!keyRaw) throw new Error("ABRAXAS_BACKUP_ENCRYPTION_KEY is required");

  assertDisposableRestoreTarget(restoreUrl, env);

  const outputDir = env.ABRAXAS_BACKUP_OUTPUT_DIR?.trim() || ".abraxas-backups/demo";
  appendBackupAuditLog(outputDir, "restore_started", {
    manifest: manifestPath,
    restore_target: "disposable",
  });

  let tmpDump: string | undefined;
  try {
    const restored = restoreFromManifestFile(manifestPath, restoreUrl, keyRaw);
    tmpDump = restored.tmpDump;
    const manifest = restored.manifest;

    const client = await createRecoveryPgClient({
      databaseUrl: restoreUrl,
      env: { ...env, DEMO_SUPABASE_SSL_ROOT_CERT_PATH: undefined },
    });
    try {
      await client.query("select 1");
      const { inventoryHash, integrityHash } = await verifyRestoredSnapshot(client, manifest);
      const inventoryRows = await fetchRecoveryInventory(client);

      appendBackupAuditLog(outputDir, "restore_completed", { verified: true });
      appendBackupAuditLog(outputDir, "verify_passed", {
        inventory_hash_sha256: inventoryHash,
        integrity_hash_sha256: integrityHash,
      });

      console.log(JSON.stringify({
        ok: true,
        verified: true,
        inventory_hash_sha256: inventoryHash,
        integrity_hash_sha256: integrityHash,
        inventory: Object.fromEntries(inventoryRows.map((r) => [r.label, r.n])),
      }));
    } finally {
      await client.end();
    }
  } catch (error) {
    appendBackupAuditLog(outputDir, "restore_failed", {
      error: redactDatabaseSecrets(error instanceof Error ? error.message : String(error), env),
    });
    throw error;
  } finally {
    if (tmpDump) cleanupTempDump(tmpDump);
  }
}

main().catch((error) => {
  console.error(redactDatabaseSecrets(error instanceof Error ? error.message : String(error), process.env));
  process.exit(1);
});
