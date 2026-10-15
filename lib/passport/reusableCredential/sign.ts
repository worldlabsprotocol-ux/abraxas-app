// FILE: lib/passport/reusableCredential/sign.ts

import { createHash } from "crypto";
import nacl from "tweetnacl";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  PASSPORT_REUSABLE_CREDENTIAL_MEDIA_TYPE,
  type PassportReusableCredentialPayload,
  type SignedPassportReusableCredential,
} from "./contract";

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

export function hashPassportCredentialPayload(payload: PassportReusableCredentialPayload): string {
  return createHash("sha256").update(canonicalizeJson(payload), "utf8").digest("hex");
}

export function signPassportReusableCredential(
  payload: PassportReusableCredentialPayload,
  key: ReceiptSigningKeyPair,
): SignedPassportReusableCredential {
  const payload_hash = hashPassportCredentialPayload(payload);
  const message = Buffer.from(payload_hash, "hex");
  const keyPair = ed25519KeyPairFromJwk(key.privateKeyJwk);
  const signature = base64UrlEncode(nacl.sign.detached(message, keyPair.secretKey));
  return {
    media_type: PASSPORT_REUSABLE_CREDENTIAL_MEDIA_TYPE,
    payload,
    payload_hash,
    signature,
  };
}

export function verifyPassportReusableCredentialSignature(
  credential: SignedPassportReusableCredential,
  publicKeyJwk: JsonWebKey,
): boolean {
  const recomputed = hashPassportCredentialPayload(credential.payload);
  if (recomputed !== credential.payload_hash) return false;
  if (!publicKeyJwk.x) return false;
  const message = Buffer.from(credential.payload_hash, "hex");
  const pub = base64UrlDecode(publicKeyJwk.x);
  const sig = base64UrlDecode(credential.signature);
  return nacl.sign.detached.verify(message, sig, pub);
}

export function credentialPayloadBytesForAudit(payload: PassportReusableCredentialPayload): string {
  return canonicalizeJson(payload);
}
