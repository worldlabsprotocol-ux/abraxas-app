#!/usr/bin/env npx tsx
/**
 * Build #558 — encrypted sovereign backup for persistent staging (Build #552 pipeline).
 */
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { appendBackupAuditLog } from "@/lib/databaseRecovery/auditLog";
import { parseBackupEncryptionKey } from "@/lib/databaseRecovery/encryption";
import { resolveSovereignBackupDatabaseUrl } from "@/lib/databaseRecovery/sovereignBackupEnv";
import {
  assertBackupSourceReady,
  collectBackupSnapshot,
  runPgDump,
  writeEncryptedBackupArtifact,
} from "@/lib/databaseRecovery/pipeline";
import { pruneBackupArtifacts } from "@/lib/databaseRecovery/retention";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { validateStagingPersistentEnv } from "@/lib/sovereignRuntime/sovereignActivationPolicy";

function parseKeepLast(env: Record<string, string | undefined>): number {
  const raw = env.ABRAXAS_BACKUP_KEEP_LAST?.trim();
  if (!raw) return 14;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 14;
}

async function main(): Promise<void> {
  const env = process.env;
  const gate = validateStagingPersistentEnv(env);
  if (!gate.ok) {
    console.error(JSON.stringify({ build: 558, tier: "BLOCKED", staging: gate }, null, 2));
    process.exit(1);
  }

  const databaseUrl = resolveSovereignBackupDatabaseUrl(env);
  if (!databaseUrl) {
    throw new Error("ABRAXAS_BACKUP_SCOPE=sovereign and ABRAXAS_DATABASE_URL are required");
  }

  const databaseId = env.ABRAXAS_SOVEREIGN_DATABASE_ID!.trim();
  const keyRaw = env.ABRAXAS_BACKUP_ENCRYPTION_KEY!.trim();
  const key = parseBackupEncryptionKey(keyRaw);
  const outputDir = env.ABRAXAS_BACKUP_OUTPUT_DIR!.trim();
  const keepLast = parseKeepLast(env);

  appendBackupAuditLog(outputDir, "backup_started", {
    sovereign_database_id: databaseId,
    output_dir: outputDir,
  });

  const client = await createRecoveryPgClient({ databaseUrl, env });
  try {
    await assertBackupSourceReady(client);
    const snapshot = await collectBackupSnapshot(client);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpPath = join(outputDir, `sovereign-${databaseId}-${stamp}.dump`);

    runPgDump(databaseUrl, dumpPath, {
      serializableDeferrable: env.ABRAXAS_BACKUP_SERIALIZABLE_DEFERRABLE?.trim() === "1",
    });
    const plain = readFileSync(dumpPath);
    rmSync(dumpPath, { force: true });

    const { manifestPath, encPath, manifest } = writeEncryptedBackupArtifact({
      outputDir,
      projectRef: databaseId,
      stamp,
      snapshot,
      plaintext: plain,
      key,
    });

    const pruned = pruneBackupArtifacts(outputDir, keepLast);

    appendBackupAuditLog(outputDir, "backup_completed", {
      sovereign_database_id: databaseId,
      manifest: manifestPath.split("/").pop()!,
      ciphertext: encPath.split("/").pop()!,
      inventory_hash_sha256: manifest.inventory_hash_sha256,
      integrity_hash_sha256: manifest.integrity_hash_sha256,
      pruned_artifacts: pruned.length,
    });

    console.log(
      JSON.stringify(
        {
          build: 558,
          tier: "BACKUP_COMPLETE",
          manifest_path: manifestPath,
          ciphertext_path: encPath,
          inventory_hash_sha256: manifest.inventory_hash_sha256,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
