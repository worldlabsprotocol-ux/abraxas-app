#!/usr/bin/env npx tsx
// FILE: scripts/database-recovery/backup-demo-database.ts
// Abraxas-owned encrypted pg_dump for authorized demo only.

import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { appendBackupAuditLog } from "@/lib/databaseRecovery/auditLog";
import { parseBackupEncryptionKey } from "@/lib/databaseRecovery/encryption";
import { assertDemoBackupScope } from "@/lib/databaseRecovery/guard";
import {
  collectBackupSnapshot,
  runPgDump,
  writeEncryptedBackupArtifact,
} from "@/lib/databaseRecovery/pipeline";
import { pruneBackupArtifacts } from "@/lib/databaseRecovery/retention";
import { createDemoPgClient } from "@/scripts/demo/lib/demoPgClient";
import { buildSessionPoolerConnectionString, redactDatabaseSecrets } from "@/scripts/demo/lib/demoDatabaseUrl";

function parseKeepLast(env: Record<string, string | undefined>): number {
  const raw = env.ABRAXAS_BACKUP_KEEP_LAST?.trim();
  if (!raw) return 7;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

async function main(): Promise<void> {
  const env = process.env;
  const { demoProjectRef, databaseUrl } = assertDemoBackupScope(env);

  const keyRaw = env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim();
  if (!keyRaw) {
    throw new Error("ABRAXAS_BACKUP_ENCRYPTION_KEY is required (openssl rand -base64 32)");
  }
  const key = parseBackupEncryptionKey(keyRaw);

  const outputDir = env.ABRAXAS_BACKUP_OUTPUT_DIR?.trim() || join(process.cwd(), ".abraxas-backups/demo");
  const keepLast = parseKeepLast(env);

  appendBackupAuditLog(outputDir, "backup_started", {
    project_ref: demoProjectRef,
    output_dir: outputDir,
  });

  const client = await createDemoPgClient({ databaseUrl, env });
  try {
    const snapshot = await collectBackupSnapshot(client);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpPath = join(outputDir, `demo-${demoProjectRef}-${stamp}.dump`);

    const conn =
      databaseUrl.includes("pooler.supabase.com")
        ? buildSessionPoolerConnectionString(databaseUrl)
        : databaseUrl;

    runPgDump(conn, dumpPath);
    const plain = readFileSync(dumpPath);
    rmSync(dumpPath, { force: true });

    const { manifestPath, encPath, manifest } = writeEncryptedBackupArtifact({
      outputDir,
      projectRef: demoProjectRef,
      stamp,
      snapshot,
      plaintext: plain,
      key,
    });

    const pruned = pruneBackupArtifacts(outputDir, keepLast);

    appendBackupAuditLog(outputDir, "backup_completed", {
      project_ref: demoProjectRef,
      manifest: manifestPath.split("/").pop()!,
      ciphertext: encPath.split("/").pop()!,
      inventory_hash_sha256: manifest.inventory_hash_sha256,
      integrity_hash_sha256: manifest.integrity_hash_sha256,
      pruned_artifacts: pruned.length,
    });

    console.log(JSON.stringify({
      ok: true,
      project_ref: demoProjectRef,
      manifest_path: manifestPath,
      ciphertext_path: encPath,
      inventory_hash_sha256: manifest.inventory_hash_sha256,
      integrity_hash_sha256: manifest.integrity_hash_sha256,
      keep_last: keepLast,
      pruned_artifacts: pruned.length,
    }));
  } catch (error) {
    const message = redactDatabaseSecrets(error instanceof Error ? error.message : String(error), env);
    appendBackupAuditLog(outputDir, "backup_failed", { error: message });
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(redactDatabaseSecrets(error instanceof Error ? error.message : String(error), process.env));
  process.exit(1);
});
