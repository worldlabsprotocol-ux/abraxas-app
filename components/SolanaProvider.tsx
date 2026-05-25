// FILE: components/SolanaProvider.tsx
// Solana-native only. No WalletConnect, no EVM, no Reown.
// Phantom + Solflare directly. Wrapped as client component.
"use client";

import { useMemo }                       from "react";
import { clusterApiUrl, Connection }      from "@solana/web3.js";
import { WalletAdapterNetwork }           from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter }           from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter }          from "@solana/wallet-adapter-solflare";
import {
  ConnectionProvider,
  WalletProvider,
}                                         from "@solana/wallet-adapter-react";
import { WalletModalProvider }            from "@solana/wallet-adapter-react-ui";

const NETWORK   = WalletAdapterNetwork.Mainnet;
const RPC       = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl(NETWORK);

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => RPC, []);
  const wallets  = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: NETWORK }),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
