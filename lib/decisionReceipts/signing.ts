// FILE: lib/decisionReceipts/signing.ts
// Server-side Ed25519 signing for decision receipts — never exposed to browser.

import { createHash } from "crypto";
import nacl from "tweetnacl";
import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";
import { canonicalizeJson, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";

export interface ReceiptSigningKeyPair {
  signingKeyId: string;
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function ed25519KeyPairFromJwk(privateJwk: JsonWebKey): nacl.SignKeyPair {
  if (!privateJwk.d) throw new Error("Ed25519 private JWK missing d");
  const seed = base64UrlDecode(privateJwk.d);
  if (seed.length !== 32) throw new Error("Invalid Ed25519 seed length");
  return nacl.sign.keyPair.fromSeed(seed);
}

export function getReceiptSigningKeyId(): string {
  return process.env.ABRAXAS_SIGNING_KEY_ID ?? "abraxas-primary";
}

export function loadReceiptSigningKey(): ReceiptSigningKeyPair | null {
  const signingKeyJson = process.env.ABRAXAS_SIGNING_KEY;
  if (!signingKeyJson) return null;
  try {
    const privateKeyJwk = JSON.parse(signingKeyJson) as JsonWebKey;
    const publicKeyJson = process.env.ABRAXAS_PUBLIC_KEY;
    const publicKeyJwk = publicKeyJson
      ? (JSON.parse(publicKeyJson) as JsonWebKey)
      : { kty: privateKeyJwk.kty, crv: privateKeyJwk.crv, x: privateKeyJwk.x };
    return {
      signingKeyId: getReceiptSigningKeyId(),
      privateKeyJwk,
      publicKeyJwk,
    };
  } catch {
    return null;
  }
}

export function loadReceiptVerificationKey(): JsonWebKey | null {
  const publicKeyJson = process.env.ABRAXAS_PUBLIC_KEY;
  if (!publicKeyJson) {
    const signing = loadReceiptSigningKey();
    return signing?.publicKeyJwk ?? null;
  }
  try {
    return JSON.parse(publicKeyJson) as JsonWebKey;
  } catch {
    return null;
  }
}

/** Sign SHA-256 hash of canonical payload bytes */
export function signReceiptPayload(
  payload: DecisionReceiptCanonicalPayload,
  privateKeyJwk: JsonWebKey,
): { payloadHash: string; signature: string } {
  const canonical = canonicalizeJson(payload);
  const payloadHash = createHash("sha256").update(canonical, "utf8").digest("hex");
  const message = Buffer.from(payloadHash, "hex");
  const keyPair = ed25519KeyPairFromJwk(privateKeyJwk);
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  return {
    payloadHash,
    signature: base64UrlEncode(signature),
  };
}

export function verifyReceiptSignature(
  payload: DecisionReceiptCanonicalPayload,
  signature: string,
  publicKeyJwk: JsonWebKey,
): boolean {
  if (!publicKeyJwk.x) return false;
  const payloadHash = hashCanonicalPayload(payload);
  const message = Buffer.from(payloadHash, "hex");
  const pubKey = base64UrlDecode(publicKeyJwk.x);
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(signature);
  } catch {
    return false;
  }
  return nacl.sign.detached.verify(message, sig, pubKey);
}

/** Generate ephemeral Ed25519 key pair for tests */
export function generateTestSigningKeyPair(): ReceiptSigningKeyPair {
  const keyPair = nacl.sign.keyPair();
  const privateKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64UrlEncode(keyPair.publicKey),
    d: base64UrlEncode(keyPair.secretKey.slice(0, 32)),
  };
  const publicKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64UrlEncode(keyPair.publicKey),
  };
  return {
    signingKeyId: "test-signing-key",
    privateKeyJwk,
    publicKeyJwk,
  };
}
