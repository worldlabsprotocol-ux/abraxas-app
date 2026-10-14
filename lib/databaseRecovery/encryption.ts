// FILE: lib/databaseRecovery/encryption.ts
// Abraxas-controlled symmetric encryption (OpenSSL-compatible AES-256-GCM).

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export function parseBackupEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  const key = Buffer.from(trimmed, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ABRAXAS_BACKUP_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (use: openssl rand -base64 32)`,
    );
  }
  return key;
}

/** Layout: [12-byte IV][16-byte auth tag][ciphertext] */
export function encryptBackupPlaintext(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_BYTES) {
    throw new Error("unexpected GCM tag length");
  }
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptBackupCiphertext(payload: Buffer, key: Buffer): Buffer {
  if (payload.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error("ciphertext too short");
  }
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
