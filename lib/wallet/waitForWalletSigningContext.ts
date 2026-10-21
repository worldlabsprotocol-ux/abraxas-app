// FILE: lib/wallet/waitForWalletSigningContext.ts
// Wait for wallet-adapter React state after connect() — switching to Phantom must not cancel signing.

import type { PublicKey } from "@solana/web3.js";

export type WalletSignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

export async function waitForWalletSigningContext(input: {
  getPublicKey: () => PublicKey | null;
  getSignMessage: () => WalletSignMessageFn | undefined;
  getConnected?: () => boolean;
  maxWaitMs?: number;
}): Promise<{ publicKey: PublicKey; signMessage: WalletSignMessageFn } | null> {
  const deadline = Date.now() + (input.maxWaitMs ?? 8_000);

  const ready = () => {
    const publicKey = input.getPublicKey();
    const signMessage = input.getSignMessage();
    if (publicKey && signMessage) {
      return { publicKey, signMessage };
    }
    return null;
  };

  const first = ready();
  if (first) return first;

  return new Promise((resolve) => {
    const schedule =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (fn: () => void) => setTimeout(fn, 16);
    const tick = () => {
      const next = ready();
      if (next) {
        resolve(next);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      schedule(tick);
    };
    schedule(tick);
  });
}
