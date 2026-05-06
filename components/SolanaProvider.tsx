"use client";

import { ReactNode, useMemo } from "react";
import type { FC, PropsWithChildren } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
// RPC URL inlined — avoids @/lib/solanaRpc import issue

// Default wallet adapter UI styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

/**
 * SolanaProvider — wires up the wallet adapter context.
 * RPC endpoint comes from `getSolanaRpcUrl()` so every consumer
 * (provider, balance hook, anything calling Connection) shares it.
 */
export function SolanaProvider({ children }: Props) {
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", []);

  // Modern Wallet Standard wallets (Backpack, Glow, etc.) auto-register.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  // Cast required: @solana/wallet-adapter-react types were written for React 18.
  // React 19 changed FC return type — this cast is safe, runtime behavior is identical.
  const CP  = ConnectionProvider  as FC<PropsWithChildren<{ endpoint: string }>>;
  const WP  = WalletProvider      as FC<PropsWithChildren<{ wallets: ReturnType<typeof useMemo>; autoConnect?: boolean }>>;
  const WMP = WalletModalProvider as FC<PropsWithChildren>;

  return (
    <CP endpoint={endpoint}>
      <WP wallets={wallets} autoConnect>
        <WMP>{children}</WMP>
      </WP>
    </CP>
  );
}