"use client";

import { ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { getSolanaRpcUrl } from "@/lib/solanaRpc";

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
  const endpoint = useMemo(() => getSolanaRpcUrl(), []);

  // Modern Wallet Standard wallets (Backpack, Glow, etc.) auto-register.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
