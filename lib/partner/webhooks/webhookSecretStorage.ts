// FILE: lib/partner/webhooks/webhookSecretStorage.ts
// Encrypt webhook signing secrets at rest — reveal raw value once to admin only.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { hashWebhookSigningSecret } from "@/lib/partner/webhooks/webhookSigning";

function masterKey(): Buffer | null {
  const raw = process.env.ABRAXAS_WEBHOOK_MASTER_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptWebhookSigningSecret(rawSecret: string): {
  ciphertext: string;
  iv: string;
  hash: string;
} | null {
  const key = masterKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(rawSecret, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return {
    ciphertext: encrypted.toString("base64url"),
    iv: iv.toString("base64url"),
    hash: hashWebhookSigningSecret(rawSecret),
  };
}

export function decryptWebhookSigningSecret(input: {
  ciphertext: string;
  iv: string;
}): string | null {
  const key = masterKey();
  if (!key) return null;

  try {
    const data = Buffer.from(input.ciphertext, "base64url");
    const iv = Buffer.from(input.iv, "base64url");
    const authTag = data.subarray(data.length - 16);
    const payload = data.subarray(0, data.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
