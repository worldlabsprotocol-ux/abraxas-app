// FILE: lib/persistence/evidenceBlobStore.ts
// Abraxas-controlled encrypted identity evidence blobs (filesystem; no Supabase Storage).

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function evidenceRoot(env: Record<string, string | undefined> = process.env): string {
  return env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim() || join(process.cwd(), ".abraxas-evidence");
}

function parseEvidenceKey(env: Record<string, string | undefined>): Buffer {
  const raw = env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY?.trim()
    ?? env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("ABRAXAS_EVIDENCE_ENCRYPTION_KEY is required for encrypted evidence storage");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("evidence encryption key must decode to 32 bytes");
  }
  return key;
}

export function encryptEvidenceBlob(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptEvidenceBlob(payload: Buffer, key: Buffer): Buffer {
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function storeEncryptedEvidence(input: {
  holderSubjectId: string;
  captureSessionId: string;
  plaintext: Buffer;
  env?: Record<string, string | undefined>;
}): { storagePath: string; contentSha256: string } {
  const env = input.env ?? process.env;
  const key = parseEvidenceKey(env);
  const root = evidenceRoot(env);
  const dir = join(root, input.holderSubjectId);
  mkdirSync(dir, { recursive: true });
  const contentSha256 = createHash("sha256").update(input.plaintext).digest("hex");
  const fileName = `${input.captureSessionId}.enc`;
  const storagePath = join(dir, fileName);
  writeFileSync(storagePath, encryptEvidenceBlob(input.plaintext, key));
  return { storagePath, contentSha256 };
}

export function readEncryptedEvidence(input: {
  storagePath: string;
  env?: Record<string, string | undefined>;
}): Buffer {
  const env = input.env ?? process.env;
  const key = parseEvidenceKey(env);
  const payload = readFileSync(input.storagePath);
  return decryptEvidenceBlob(payload, key);
}
