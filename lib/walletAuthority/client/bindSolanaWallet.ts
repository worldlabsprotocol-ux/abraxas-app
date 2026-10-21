"use client";
// FILE: lib/walletAuthority/client/bindSolanaWallet.ts
// Solana passport wallet auth — establishes session + wallet_control binding on verify.

import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { runPassportSolanaWalletAuth } from "@/lib/wallet/passportSolanaAuthClient";

export interface BindSolanaWalletOptions {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  intendedAction?: typeof HOLDER_AUTH_ACTIONS.partnerVerify | typeof HOLDER_AUTH_ACTIONS.passportSignIn;
  solanaNetwork?: string;
}

export async function bindSolanaWalletToPassport(options: BindSolanaWalletOptions): Promise<void> {
  const solanaNetwork = options.solanaNetwork ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  const intendedAction = options.intendedAction ?? HOLDER_AUTH_ACTIONS.partnerVerify;

  const auth = await runPassportSolanaWalletAuth({
    walletAddress: options.walletAddress,
    signMessage: options.signMessage,
    intendedAction,
    solanaNetwork,
  });
  if (!auth.ok) {
    throw new Error(auth.code);
  }
}
