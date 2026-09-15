// FILE: lib/partner/launchpad/productionKeyEnvelope.ts
// Encrypt production keys for one time partner reveal. Only hashes persist in partner_api_keys.

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ENVELOPE_INFO = "abraxas:launchpad:production-key-envelope:v1";

function envelopeKey(applicationId: string): Buffer | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) return null;
  return createHmac("sha256", raw)
    .update(`${ENVELOPE_INFO}:${applicationId}`)
    .digest();
}

export function encryptProductionKeyForReveal(applicationId: string, apiKey: string): string | null {
  const key = envelopeKey(applicationId);
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptProductionKeyForReveal(applicationId: string, payload: string): string | null {
  const key = envelopeKey(applicationId);
  if (!key) return null;
  try {
    const buf = Buffer.from(payload, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
