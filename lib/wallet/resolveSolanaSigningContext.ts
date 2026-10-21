// FILE: lib/wallet/resolveSolanaSigningContext.ts

import type { Wallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import type { WalletSignMessageFn } from "./waitForWalletSigningContext";

export function resolveSolanaSigningContext(input: {
  publicKey: PublicKey | null;
  signMessage: WalletSignMessageFn | undefined;
  wallet: Wallet | null;
  wallets: Wallet[];
  preferredWalletId?: string;
}): { publicKey: PublicKey | null; signMessage: WalletSignMessageFn | undefined } {
  const preferred = input.preferredWalletId ?? "Phantom";
  const adapterWallet =
    input.wallet?.adapter.name === preferred
      ? input.wallet.adapter
      : input.wallets.find((w) => w.adapter.name === preferred)?.adapter;

  const adapterSignMessage = adapterWallet
    ? (adapterWallet as { signMessage?: WalletSignMessageFn }).signMessage
    : undefined;

  const publicKey = input.publicKey ?? adapterWallet?.publicKey ?? null;
  const boundSign = input.signMessage ?? adapterSignMessage?.bind(adapterWallet);
  const signMessage = boundSign ? (message: Uint8Array) => boundSign(message) : undefined;

  return { publicKey, signMessage };
}
