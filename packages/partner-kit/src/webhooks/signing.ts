import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_SIGNATURE_VERSION = "v1";
export const WEBHOOK_TIMESTAMP_HEADER = "x-abraxas-webhook-timestamp";
export const WEBHOOK_EVENT_ID_HEADER = "x-abraxas-webhook-id";
export const WEBHOOK_SIGNATURE_HEADER = "x-abraxas-webhook-signature";

export function signWebhookBody(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
}): string {
  const signedPayload = `${input.timestamp}.${input.rawBody}`;
  const digest = createHmac("sha256", input.secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `${WEBHOOK_SIGNATURE_VERSION}=${digest}`;
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signatureHeader: string;
  maxSkewSec?: number;
  nowSec?: number;
}): { ok: true } | { ok: false; error: string } {
  const maxSkew = input.maxSkewSec ?? 300;
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, error: "invalid_timestamp" };
  if (Math.abs(now - ts) > maxSkew) return { ok: false, error: "timestamp_skew" };

  const expected = signWebhookBody({
    secret: input.secret,
    timestamp: input.timestamp,
    rawBody: input.rawBody,
  });

  const provided = input.signatureHeader.trim();
  if (!provided.startsWith(`${WEBHOOK_SIGNATURE_VERSION}=`)) {
    return { ok: false, error: "invalid_signature_format" };
  }

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, error: "invalid_signature" };
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, error: "invalid_signature" };
  }
  return { ok: true };
}

export function hashWebhookSigningSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
