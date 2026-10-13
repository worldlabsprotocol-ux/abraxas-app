// FILE: lib/sui/walletStandard/discoverSuiWallets.ts
// Discover Sui-compatible wallets via Wallet Standard (no Abraxas session required).

import type { Wallet } from "@wallet-standard/base";
import { StandardConnect } from "@wallet-standard/features";

export const SUI_CHAIN_PREFIX = "sui:";

export function walletSupportsSuiChain(wallet: Wallet): boolean {
  return wallet.chains.some((chain) => chain.startsWith(SUI_CHAIN_PREFIX));
}

export function walletHasStandardConnect(wallet: Wallet): boolean {
  return StandardConnect in wallet.features;
}

/** Wallets that can connect on Sui networks. */
export function filterSuiCompatibleWallets(wallets: readonly Wallet[]): Wallet[] {
  return wallets.filter((w) => walletSupportsSuiChain(w) && walletHasStandardConnect(w));
}

export function resolveSuiNetworkLabel(): string {
  const raw = process.env.NEXT_PUBLIC_SUI_NETWORK?.trim().toLowerCase();
  if (raw === "mainnet") return "Sui Mainnet";
  if (raw === "testnet") return "Sui Testnet";
  return "Sui Devnet";
}
