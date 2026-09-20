// FILE: lib/partner/evmWalletBinding/verify.ts
// EIP-191 personal_sign via viem. Message proof only. No transactions.

import { getAddress, recoverMessageAddress, verifyMessage } from "viem";

export function normalizeEvmAddress(value: string): string | null {
  try {
    return getAddress(value.trim()).toLowerCase();
  } catch {
    return null;
  }
}

export async function recoverEvmSignedAddress(input: {
  message: string;
  signature: string;
}): Promise<string | null> {
  try {
    const recovered = await recoverMessageAddress({
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    const normalized = normalizeEvmAddress(recovered);
    if (!normalized) return null;
    const ok = await verifyMessage({
      address: recovered,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    return ok ? normalized : null;
  } catch {
    return null;
  }
}
