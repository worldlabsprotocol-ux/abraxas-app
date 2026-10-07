// FILE: lib/sui/zklogin/nativeHandoffCrypto.ts
// Shared encryption helpers for native auth bridge server-side payloads.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function bridgeSecret(): Buffer | null {
  const raw =
    process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    ?? process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptNativeBridgePayload(payload: unknown): string | null {
  const secret = bridgeSecret();
  if (!secret) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptNativeBridgePayload<T>(encoded: string): T | null {
  const secret = bridgeSecret();
  if (!secret) return null;
  try {
    const buf = Buffer.from(encoded, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secret, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(plaintext) as T;
  } catch {
    return null;
  }
}

export function hashNativeBridgeValue(prefix: string, value: string): string {
  return createHash("sha256").update(`${prefix}:${value.trim()}`, "utf8").digest("hex");
}
