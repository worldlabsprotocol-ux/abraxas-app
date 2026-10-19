// FILE: lib/auth/ephemeralWallet/sandboxHolderPossessionKey.shared.ts
// Ephemeral Ed25519 possession keys for sandbox demonstration credentials only.
// Not account recovery. Not used for genuine third-party issuer credentials.

import { createHash } from "crypto";
import nacl from "tweetnacl";

export type SandboxSessionPossessionKeyPair = {
  publicKeyB64Url: string;
  secretKey: Uint8Array;
};

export function generateSandboxSessionPossessionKeyPair(): SandboxSessionPossessionKeyPair {
  const pair = nacl.sign.keyPair();
  return {
    publicKeyB64Url: Buffer.from(pair.publicKey).toString("base64url"),
    secretKey: pair.secretKey,
  };
}

export function isValidSandboxHolderPossessionPublicKeyB64Url(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const bytes = Buffer.from(trimmed, "base64url");
    return bytes.length === nacl.sign.publicKeyLength;
  } catch {
    return false;
  }
}

/**
 * @deprecated Public-wallet derivation is not secret; retained only for adversarial tests
 * proving address knowledge alone must not authorize a session-bound sandbox presentation.
 */
export function deriveEphemeralSandboxPossessionSecretKeyFromPublicWalletAddress(walletAddress: string): Uint8Array {
  const seed = Uint8Array.from(
    createHash("sha256")
      .update(`abraxas-ephemeral-sandbox-possession-v1|${walletAddress.trim()}`, "utf8")
      .digest(),
  );
  return nacl.sign.keyPair.fromSeed(seed).secretKey;
}
