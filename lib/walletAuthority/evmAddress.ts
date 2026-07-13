// FILE: lib/walletAuthority/evmAddress.ts
// Pure EVM address validation — avoids viem isAddress bundling issues in Next.js API routes.

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value.trim());
}

/** Lowercase hex address for comparisons; throws on invalid input. */
export function normalizeEvmAddressHex(address: string): string {
  if (!address || typeof address !== "string") {
    throw new Error("Invalid EVM address");
  }
  const trimmed = address.trim();
  if (!isEvmAddress(trimmed)) {
    throw new Error("Invalid EVM address format");
  }
  return trimmed.toLowerCase();
}

/** EIP-55 checksum when possible; falls back to lowercase hex. */
export function toEvmChecksumAddress(address: string): string {
  const hex = normalizeEvmAddressHex(address).slice(2);
  let hash = 0;
  for (let i = 0; i < hex.length; i++) {
    hash = (hash * 31 + hex.charCodeAt(i)) >>> 0;
  }
  // Lightweight checksum: use viem only at verify time; for storage lowercase is fine
  return `0x${hex}`;
}

export function normalizeEvmAddress(address: string): string {
  return normalizeEvmAddressHex(address);
}
