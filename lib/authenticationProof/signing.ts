// FILE: lib/authenticationProof/signing.ts

import nacl from "tweetnacl";
import { loadReceiptSigningKey, loadReceiptVerificationKey, getReceiptSigningKeyId } from "@/lib/decisionReceipts/signing";
import { hashAuthProofPayload } from "./canonical";
import type { AuthenticationProofPayload } from "./types";

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

export function signAuthProofPayload(payload: AuthenticationProofPayload): {
  payloadHash: string;
  signature: string;
  signingKeyId: string;
} | null {
  const key = loadReceiptSigningKey();
  if (!key?.privateKeyJwk.d) return null;

  const payloadHash = hashAuthProofPayload(payload);
  const message = Buffer.from(payloadHash, "hex");
  const seed = base64UrlDecode(key.privateKeyJwk.d);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const signature = Buffer.from(nacl.sign.detached(message, keyPair.secretKey)).toString("base64url");

  return {
    payloadHash,
    signature,
    signingKeyId: getReceiptSigningKeyId(),
  };
}

export function verifyAuthProofSignature(payload: AuthenticationProofPayload, signature: string): boolean {
  const publicKeyJwk = loadReceiptVerificationKey();
  if (!publicKeyJwk?.x) return false;

  const payloadHash = hashAuthProofPayload(payload);
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
