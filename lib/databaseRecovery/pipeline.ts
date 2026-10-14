// FILE: lib/databaseRecovery/pipeline.ts
// Shared encrypt → manifest → restore → verify cycle (disposable Postgres).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encryptBackupPlaintext, parseBackupEncryptionKey, decryptBackupCiphertext } from "./encryption";
import { hashIntegrity, hashInventory } from "./fingerprints";
import {
  BACKUP_MANIFEST_VERSION,
  BACKUP_TOOL_VERSION,
  sha256FileHex,
  type AbraxasBackupManifest,
} from "./manifest";
import { fetchRecoveryIntegrity, fetchRecoveryInventory, fetchSupabaseMigrationVersions } from "./pgInventory";
import type { PgQueryable } from "./pgInventory";

export async function collectBackupSnapshot(client: PgQueryable): Promise<{
  inventoryRows: Awaited<ReturnType<typeof fetchRecoveryInventory>>;
  integrity: Awaited<ReturnType<typeof fetchRecoveryIntegrity>>;
  migrationVersions: string[];
  inventoryHash: string;
  integrityHash: string;
  inventoryRecord: Record<string, string>;
}> {
  const inventoryRows = await fetchRecoveryInventory(client);
  const integrity = await fetchRecoveryIntegrity(client);
  const migrationVersions = await fetchSupabaseMigrationVersions(client);
  const inventoryHash = hashInventory(inventoryRows);
  const integrityHash = hashIntegrity(integrity);
  const inventoryRecord: Record<string, string> = {};
  for (const row of inventoryRows) inventoryRecord[row.label] = row.n;
  return {
    inventoryRows,
    integrity,
    migrationVersions,
    inventoryHash,
    integrityHash,
    inventoryRecord,
  };
}

export function runPgDump(sourceUrl: string, dumpPath: string): void {
  execFileSync(
    "pg_dump",
    ["--dbname", sourceUrl, "--format=custom", "--no-owner", "--no-acl", "--file", dumpPath],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
  );
}

export function runPgRestore(restoreUrl: string, dumpPath: string): void {
  execFileSync(
    "pg_restore",
    ["--dbname", restoreUrl, "--clean", "--if-exists", "--no-owner", "--no-acl", dumpPath],
    { stdio: "inherit" },
  );
}

export function writeEncryptedBackupArtifact(params: {
  outputDir: string;
  projectRef: string;
  stamp: string;
  snapshot: Awaited<ReturnType<typeof collectBackupSnapshot>>;
  plaintext: Buffer;
  key: Buffer;
}): { manifestPath: string; encPath: string; manifest: AbraxasBackupManifest } {
  const { outputDir, projectRef, stamp, snapshot, plaintext, key } = params;
  mkdirSync(outputDir, { recursive: true });

  const baseName = `demo-${projectRef}-${stamp}`;
  const ciphertextFilename = `${baseName}.dump.enc`;
  const encPath = join(outputDir, ciphertextFilename);

  const ciphertext = encryptBackupPlaintext(plaintext, key);
  writeFileSync(encPath, ciphertext);

  const manifest: AbraxasBackupManifest = {
    manifest_version: BACKUP_MANIFEST_VERSION,
    tool_version: BACKUP_TOOL_VERSION,
    created_at: new Date().toISOString(),
    database_identity: {
      supabase_project_ref: projectRef,
      postgres_database: "postgres",
    },
    schema_snapshot: {
      supabase_migration_versions: snapshot.migrationVersions,
    },
    inventory_hash_sha256: snapshot.inventoryHash,
    integrity_hash_sha256: snapshot.integrityHash,
    inventory: snapshot.inventoryRecord,
    integrity: snapshot.integrity,
    artifact: {
      format: "pg_dump_custom_encrypted",
      plaintext_sha256: sha256FileHex(plaintext),
      ciphertext_sha256: sha256FileHex(ciphertext),
      encryption: "aes-256-gcm-v1",
      dump_filename: `${baseName}.dump`,
      ciphertext_filename: ciphertextFilename,
    },
  };

  const manifestPath = join(outputDir, `${ciphertextFilename}.manifest.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifestPath, encPath, manifest };
}

export function loadAndDecryptBackup(manifestPath: string, keyRaw: string): {
  manifest: AbraxasBackupManifest;
  plaintext: Buffer;
  encPath: string;
} {
  const key = parseBackupEncryptionKey(keyRaw);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as AbraxasBackupManifest;
  const encPath = manifestPath.replace(/\.manifest\.json$/, "");
  const ciphertext = readFileSync(encPath);
  if (sha256FileHex(ciphertext) !== manifest.artifact.ciphertext_sha256) {
    throw new Error("ciphertext SHA256 does not match manifest (integrity failure)");
  }
  const plaintext = decryptBackupCiphertext(ciphertext, key);
  if (sha256FileHex(plaintext) !== manifest.artifact.plaintext_sha256) {
    throw new Error("decrypted plaintext SHA256 does not match manifest");
  }
  return { manifest, plaintext, encPath };
}

export async function verifyRestoredSnapshot(
  client: PgQueryable,
  manifest: AbraxasBackupManifest,
): Promise<{ inventoryHash: string; integrityHash: string }> {
  const inventoryRows = await fetchRecoveryInventory(client);
  const integrity = await fetchRecoveryIntegrity(client);
  const inventoryHash = hashInventory(inventoryRows);
  const integrityHash = hashIntegrity(integrity);
  if (inventoryHash !== manifest.inventory_hash_sha256) {
    throw new Error("restored inventory hash does not match manifest");
  }
  if (integrityHash !== manifest.integrity_hash_sha256) {
    throw new Error("restored integrity hash does not match manifest");
  }
  return { inventoryHash, integrityHash };
}

export function restoreFromManifestFile(
  manifestPath: string,
  restoreUrl: string,
  keyRaw: string,
): { tmpDump: string; manifest: AbraxasBackupManifest } {
  const { manifest, plaintext } = loadAndDecryptBackup(manifestPath, keyRaw);
  const tmpDump = `/tmp/abraxas-restore-${Date.now()}.dump`;
  writeFileSync(tmpDump, plaintext);
  runPgRestore(restoreUrl, tmpDump);
  return { tmpDump, manifest };
}

export function cleanupTempDump(tmpDump: string): void {
  rmSync(tmpDump, { force: true });
}
