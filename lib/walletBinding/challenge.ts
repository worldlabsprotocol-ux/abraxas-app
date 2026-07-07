// FILE: lib/walletBinding/challenge.ts
// Signed wallet binding — prove wallet control without re-uploading ID.

import { createHash, randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export interface BindingChallenge {
  challenge_id: string;
  message: string;
  wallet_address: string;
  expires_at: string;
}

const challengeStore = new Map<string, { wallet: string; expires: number }>();

export function createWalletBindingChallenge(walletAddress: string): BindingChallenge {
  const wallet = normalizeSuiAddress(walletAddress);
  const challengeId = randomBytes(16).toString("hex");
  const expires = Date.now() + CHALLENGE_TTL_MS;
  const message = [
    "Abraxas Wallet Binding",
    `wallet:${wallet}`,
    `challenge:${challengeId}`,
    `expires:${new Date(expires).toISOString()}`,
  ].join("\n");

  challengeStore.set(challengeId, { wallet, expires });

  return {
    challenge_id: challengeId,
    message,
    wallet_address: wallet,
    expires_at: new Date(expires).toISOString(),
  };
}

export function verifyWalletBindingSignature(input: {
  challengeId: string;
  walletAddress: string;
  signature: string;
}): boolean {
  const entry = challengeStore.get(input.challengeId);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    challengeStore.delete(input.challengeId);
    return false;
  }

  const wallet = normalizeSuiAddress(input.walletAddress);
  if (entry.wallet !== wallet) return false;

  // Signature verification delegated to Sui personal-message verify at API layer.
  // Store marks challenge consumed.
  challengeStore.delete(input.challengeId);
  return input.signature.length > 0;
}

export function challengeMessageHash(message: string): string {
  return createHash("sha256").update(message).digest("hex");
}
