// FILE: lib/sui/identity.ts
// Sui-native identity helpers for Abraxas verification layer.

export const SUI_DID_PREFIX = "did:sui:";

export function toSuiDid(address: string): string {
  const normalized = address.startsWith("0x") ? address : `0x${address}`;
  return `${SUI_DID_PREFIX}${normalized}`;
}

export function truncateSuiAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function truncateDid(address: string): string {
  return toSuiDid(truncateSuiAddress(address));
}

/** Accept legacy Solana pubkey or Sui 0x address in APIs during migration */
export function normalizeHolderAddress(input: string): string {
  const v = input.trim();
  if (v.startsWith("0x") && v.length >= 42) return v;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)) return v; // legacy Solana base58
  return v;
}

export function isSuiAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(input.trim());
}
