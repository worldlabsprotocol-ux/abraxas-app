// FILE: lib/partner/walletStandard/store.ts
// In-process challenge and binding store. Hashed wallet material only.

import { createHash } from "node:crypto";

export interface StoredWalletChallenge {
  challenge_id: string;
  origin: string;
  partner_id: string;
  action_contract_nonce: string;
  nonce: string;
  expires_at: string;
  purpose: string;
  consumed: boolean;
}

export interface StoredWalletBinding {
  binding_ref: string;
  partner_id: string;
  action_contract_nonce: string;
  pubkey_hash: string;
  origin: string;
  expires_at: string;
  consumed: boolean;
}

const challenges = new Map<string, StoredWalletChallenge>();
const bindings = new Map<string, StoredWalletBinding>();

export function resetWalletStandardStoreForTests(): void {
  challenges.clear();
  bindings.clear();
}

export function hashWalletPublicKey(partnerId: string, publicKeyBytes: Uint8Array): string {
  return createHash("sha256")
    .update(partnerId.trim().toLowerCase())
    .update(":")
    .update(Buffer.from(publicKeyBytes))
    .digest("hex")
    .slice(0, 40);
}

export function bindingRefFromHash(pubkeyHash: string): string {
  return `wbr_${pubkeyHash.slice(0, 32)}`;
}

export function putWalletChallenge(row: StoredWalletChallenge): void {
  challenges.set(row.challenge_id, row);
}

export function getWalletChallenge(id: string): StoredWalletChallenge | null {
  return challenges.get(id) ?? null;
}

export function consumeWalletChallenge(id: string): StoredWalletChallenge | null {
  const row = challenges.get(id);
  if (!row || row.consumed) return null;
  row.consumed = true;
  return row;
}

export function putWalletBinding(row: StoredWalletBinding): void {
  bindings.set(row.binding_ref, row);
}

export function getWalletBinding(ref: string): StoredWalletBinding | null {
  return bindings.get(ref) ?? null;
}

export function consumeWalletBinding(ref: string): "consumed" | "replayed" | "missing" {
  const row = bindings.get(ref);
  if (!row) return "missing";
  if (row.consumed) return "replayed";
  row.consumed = true;
  return "consumed";
}
