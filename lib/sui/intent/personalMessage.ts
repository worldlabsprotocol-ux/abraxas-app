// FILE: lib/sui/intent/personalMessage.ts
// Abraxas intent messages — gas-free personal message proofs (Type 0).

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import nacl from "tweetnacl";

export function buildIntentMessage(suiAddress: string, nonce: string, issuedAt: string): string {
  return `Abraxas Intent v1\nsui:${suiAddress}\nnonce:${nonce}\nat:${issuedAt}`;
}

export async function signIntentMessage(message: string, ephemeralSecretKey: string): Promise<{
  signature: string;
  publicKey: string;
}> {
  const keypair = Ed25519Keypair.fromSecretKey(ephemeralSecretKey);
  const messageBytes = new TextEncoder().encode(message);
  const signature = await keypair.sign(messageBytes);
  return {
    signature: Buffer.from(signature).toString("base64"),
    publicKey: Buffer.from(keypair.getPublicKey().toRawBytes()).toString("base64"),
  };
}

export function verifyIntentSignature(
  message: string,
  signatureB64: string,
  publicKeyB64: string,
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = Buffer.from(signatureB64, "base64");
    const publicKey = Buffer.from(publicKeyB64, "base64");
    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch {
    return false;
  }
}
