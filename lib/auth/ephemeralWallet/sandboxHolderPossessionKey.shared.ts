// FILE: lib/auth/ephemeralWallet/sandboxHolderPossessionKey.shared.ts
// Wallet-bound ephemeral possession key for sandbox Passport presentation (not account recovery).

import { createHash } from "crypto";
import nacl from "tweetnacl";

const POSSESSION_DERIVATION_CONTEXT = "abraxas-ephemeral-sandbox-possession-v1";

export function deriveEphemeralSandboxPossessionSeed(walletAddress: string): Uint8Array {
  const digest = createHash("sha256")
    .update(`${POSSESSION_DERIVATION_CONTEXT}|${walletAddress.trim()}`, "utf8")
    .digest();
  return Uint8Array.from(digest);
}

export function deriveEphemeralSandboxPossessionPublicKeyB64Url(walletAddress: string): string {
  const seed = deriveEphemeralSandboxPossessionSeed(walletAddress);
  const pair = nacl.sign.keyPair.fromSeed(seed);
  return Buffer.from(pair.publicKey).toString("base64url");
}

/** 64-byte NaCl signing secret for possession challenge signatures. */
export function deriveEphemeralSandboxPossessionSecretKey(walletAddress: string): Uint8Array {
  const seed = deriveEphemeralSandboxPossessionSeed(walletAddress);
  return nacl.sign.keyPair.fromSeed(seed).secretKey;
}
