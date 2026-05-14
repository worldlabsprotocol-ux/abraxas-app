// FILE: components/SolanaProvider.tsx
// Solana-native only. No WalletConnect, no EVM, no Reown.
// Imports Phantom and Solflare directly — no adapter-wallets aggregator
// which would pull in the WalletConnect → viem → ox/tempo chain.
"use client";

import { useMemo }                   from "react";
import { ConnectionProvider,
         WalletProvider }            from "@solana/wallet-adapter-react";
import { WalletModalProvider }       from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter }      from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter }     from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
         ?? "https://api.mainnet-beta.solana.com";

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}