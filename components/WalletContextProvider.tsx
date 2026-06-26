"use client";
// FILE: components/WalletContextProvider.tsx
// Wraps the app in Solana wallet-adapter context. This needs to sit
// near the ROOT of the app (in app/layout.tsx, around {children}),
// not inside an individual page, or only that one page gets wallet
// context and everything else won't see a connected wallet.
//
// A likely reason the earlier attempt didn't work: wallet-adapter
// depends on browser APIs (window, injected wallet extensions) that
// don't exist during server rendering. If this provider, or anything
// using useWallet(), rendered without being explicitly client-only,
// Next.js's SSR pass and the client's first paint can disagree about
// what's connected, and React silently bails out of hydrating that
// part of the tree instead of throwing a visible error. This file is
// "use client" for that exact reason, and the connect button below is
// built without the pre-packaged WalletMultiButton UI component,
// since that one specifically needs its own CSS import and a
// next/dynamic(..., { ssr: false }) wrapper to avoid the same problem,
// one more place this could have silently broken before.

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  // Use your real Helius RPC endpoint here for production reliability
  // instead of the public cluster endpoint, which rate-limits hard.
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("mainnet-beta");

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
