// FILE: lib/sui/zklogin/verifyNativeOAuthNonce.ts
// Bind Google id_token nonce to the server-side pending ephemeral zkLogin key.

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeJwt, generateNonce } from "@mysten/sui/zklogin";
import type { ZkLoginPendingSession } from "./session";

export function verifyNativeOAuthNonce(
  idToken: string,
  pending: ZkLoginPendingSession,
): boolean {
  try {
    const decoded = decodeJwt(idToken) as Record<string, unknown>;
    const tokenNonce = typeof decoded.nonce === "string" ? decoded.nonce : null;
    if (!tokenNonce) return false;

    const keypair = Ed25519Keypair.fromSecretKey(pending.ephemeralSecretKey);
    const expectedNonce = generateNonce(
      keypair.getPublicKey(),
      pending.maxEpoch,
      pending.randomness,
    );
    return tokenNonce === expectedNonce;
  } catch {
    return false;
  }
}
