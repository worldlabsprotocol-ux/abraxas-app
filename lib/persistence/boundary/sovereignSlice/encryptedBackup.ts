// FILE: lib/persistence/boundary/sovereignSlice/encryptedBackup.ts
// Abraxas-controlled backup encryption (AES-256-GCM) — key custody separate from database host.

import type { Pool } from "pg";
import {
  decryptBackupCiphertext,
  encryptBackupPlaintext,
  parseBackupEncryptionKey,
} from "@/lib/databaseRecovery/encryption";
import {
  exportSovereignSliceBackup,
  restoreSovereignSliceBackup,
  type SovereignSliceBackupPayload,
} from "./backupRestore";

export const SOVEREIGN_SLICE_BACKUP_FORMAT = "abraxas-sovereign-slice-v1" as const;

export type EncryptedSovereignSliceBackup = {
  format: typeof SOVEREIGN_SLICE_BACKUP_FORMAT;
  /** Base64 ciphertext: IV + GCM tag + payload (OpenSSL-compatible layout). */
  encrypted_payload_b64: string;
  /** Plaintext content digest from SovereignSliceBackupPayload.backup_digest. */
  content_digest: string;
};

export function encryptSovereignSlicePayload(
  payload: SovereignSliceBackupPayload,
  env: Record<string, string | undefined>,
): EncryptedSovereignSliceBackup {
  const keyRaw = env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim();
  if (!keyRaw) throw new Error("missing_backup_encryption_key");
  const key = parseBackupEncryptionKey(keyRaw);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = encryptBackupPlaintext(plaintext, key);
  return {
    format: SOVEREIGN_SLICE_BACKUP_FORMAT,
    encrypted_payload_b64: encrypted.toString("base64"),
    content_digest: payload.backup_digest,
  };
}

export function decryptSovereignSlicePayload(
  backup: EncryptedSovereignSliceBackup,
  env: Record<string, string | undefined>,
): SovereignSliceBackupPayload {
  if (backup.format !== SOVEREIGN_SLICE_BACKUP_FORMAT) {
    throw new Error("unsupported_sovereign_backup_format");
  }
  const keyRaw = env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim();
  if (!keyRaw) throw new Error("missing_backup_encryption_key");
  const key = parseBackupEncryptionKey(keyRaw);
  const ciphertext = Buffer.from(backup.encrypted_payload_b64, "base64");
  const plaintext = decryptBackupCiphertext(ciphertext, key);
  const payload = JSON.parse(plaintext.toString("utf8")) as SovereignSliceBackupPayload;
  if (payload.backup_digest !== backup.content_digest) {
    throw new Error("sovereign_encrypted_backup_digest_mismatch");
  }
  return payload;
}

export async function exportEncryptedSovereignSliceBackup(
  pool: Pool,
  env: Record<string, string | undefined>,
): Promise<EncryptedSovereignSliceBackup> {
  const payload = await exportSovereignSliceBackup(pool);
  return encryptSovereignSlicePayload(payload, env);
}

export async function restoreEncryptedSovereignSliceBackup(
  pool: Pool,
  backup: EncryptedSovereignSliceBackup,
  env: Record<string, string | undefined>,
): Promise<void> {
  const payload = decryptSovereignSlicePayload(backup, env);
  await restoreSovereignSliceBackup(pool, payload);
}
