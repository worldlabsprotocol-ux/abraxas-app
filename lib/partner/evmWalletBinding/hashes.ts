// FILE: lib/partner/evmWalletBinding/hashes.ts
// Keyed one-way hashes. Never persist raw addresses, messages, or signatures.

import { createHmac } from "node:crypto";
import { EvmWalletStoreUnavailableError } from "@/lib/partner/evmWalletBinding/errors";

function hashKey(): string {
  const key = process.env.NEXTAUTH_SECRET?.trim() ?? "";
  if (!key) throw new EvmWalletStoreUnavailableError();
  return key;
}

export function keyedEvmWalletHash(parts: string[]): string {
  const hmac = createHmac("sha256", hashKey());
  for (const part of parts) hmac.update(part).update("\0");
  return hmac.digest("hex");
}

export function hashEvmOrigin(origin: string): string {
  return keyedEvmWalletHash(["evm-origin", origin.trim()]);
}

export function hashEvmNonce(partnerId: string, nonce: string): string {
  return keyedEvmWalletHash(["evm-nonce", partnerId.trim().toLowerCase(), nonce.trim()]);
}

export function hashEvmActionContractNonce(partnerId: string, actionContractNonce: string): string {
  return keyedEvmWalletHash(["evm-action-nonce", partnerId.trim().toLowerCase(), actionContractNonce.trim()]);
}

export function hashEvmPolicy(partnerId: string, policyId: string, policyVersion: number): string {
  return keyedEvmWalletHash([
    "evm-policy",
    partnerId.trim().toLowerCase(),
    policyId.trim().toLowerCase(),
    String(policyVersion),
  ]);
}

export function hashEvmAction(partnerId: string, actionType: string, actionScope: string): string {
  return keyedEvmWalletHash([
    "evm-action",
    partnerId.trim().toLowerCase(),
    actionType.trim(),
    actionScope.trim(),
  ]);
}

export function hashEvmNetwork(partnerId: string, networkId: string): string {
  return keyedEvmWalletHash(["evm-network", partnerId.trim().toLowerCase(), networkId.trim()]);
}

export function hashEvmChallengeMessage(message: string): string {
  return keyedEvmWalletHash(["evm-message", message]);
}

export function hashEvmAddress(partnerId: string, normalizedAddress: string): string {
  return keyedEvmWalletHash([
    "evm-address",
    partnerId.trim().toLowerCase(),
    normalizedAddress.trim().toLowerCase(),
  ]);
}

export function createEvmWalletBindingRef(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ewb_${crypto.randomUUID()}`;
  }
  return `ewb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
