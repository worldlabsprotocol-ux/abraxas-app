// FILE: lib/eligibilityPresentation/sign.ts
// Reuses Ed25519 receipt signing keys. Presentation schema is not a parallel key schema.

import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey, resolveVerificationKey } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";
import type { EligibilityPresentationPayload } from "./types";

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function presentationPayloadHash(payload: EligibilityPresentationPayload): string {
  return createHash("sha256").update(canonicalizeJson(payload), "utf8").digest("hex");
}

export function signPresentationPayload(payload: EligibilityPresentationPayload): {
  signingKeyId: string;
  payloadHash: string;
  signature: string;
} | null {
  const issuance = resolveIssuanceSigningKey({ schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION });
  const loaded = loadReceiptSigningKey();
  if (!issuance.ok || !loaded) return null;
  const seedJwk = issuance.privateKeyJwk;
  if (!seedJwk.d) return null;
  const seed = base64UrlDecode(seedJwk.d);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const payloadHash = presentationPayloadHash(payload);
  const signature = nacl.sign.detached(Buffer.from(payloadHash, "hex"), keyPair.secretKey);
  return {
    signingKeyId: issuance.key_id,
    payloadHash,
    signature: base64UrlEncode(signature),
  };
}

export function verifyPresentationSignature(
  payload: EligibilityPresentationPayload,
  signature: string,
): { ok: true; keyId: string } | { ok: false; reason: string } {
  const resolved = resolveVerificationKey({
    keyId: payload.signing_key_id,
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
  });
  if (!resolved.ok) return { ok: false, reason: resolved.reason };
  if (!resolved.key.public_jwk.x) return { ok: false, reason: "unavailable" };
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(signature);
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }
  const payloadHash = presentationPayloadHash(payload);
  const ok = nacl.sign.detached.verify(
    Buffer.from(payloadHash, "hex"),
    sig,
    base64UrlDecode(resolved.key.public_jwk.x),
  );
  if (!ok) return { ok: false, reason: "invalid_signature" };
  return { ok: true, keyId: resolved.key.key_id };
}
