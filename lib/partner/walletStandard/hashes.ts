// FILE: lib/partner/walletStandard/hashes.ts
// Keyed one-way hashes. Never persist raw keys, nonces, or addresses.

import { createHmac } from "node:crypto";
import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";

function hashKey(): string {
  const key = process.env.NEXTAUTH_SECRET?.trim() ?? "";
  if (!key) throw new WalletStandardStoreUnavailableError();
  return key;
}

export function keyedWalletHash(parts: string[]): string {
  const hmac = createHmac("sha256", hashKey());
  for (const part of parts) hmac.update(part).update("\0");
  return hmac.digest("hex");
}

export function hashWalletOrigin(origin: string): string {
  return keyedWalletHash(["origin", origin.trim()]);
}

export function hashWalletNonce(partnerId: string, nonce: string): string {
  return keyedWalletHash(["nonce", partnerId.trim().toLowerCase(), nonce.trim()]);
}

export function hashActionContractNonce(partnerId: string, actionContractNonce: string): string {
  return keyedWalletHash(["action", partnerId.trim().toLowerCase(), actionContractNonce.trim()]);
}

export function hashChallengeMessage(message: string): string {
  return keyedWalletHash(["message", message]);
}

export function hashWalletPublicKey(partnerId: string, publicKeyBytes: Uint8Array): string {
  return keyedWalletHash([
    "pubkey",
    partnerId.trim().toLowerCase(),
    Buffer.from(publicKeyBytes).toString("hex"),
  ]);
}

export function bindingRefFromHash(pubkeyHash: string): string {
  return `wbr_${pubkeyHash.slice(0, 32)}`;
}
