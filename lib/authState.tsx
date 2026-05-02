// FILE: lib/authState.tsx
// Auth state — Solana wallet only.
// OAuth (Google/GitHub) removed — wallet-native authentication.
// ETH wallet (wagmi) is isolated to useOgVerification — NOT bridged here.
//
// This hook is the ONLY source of wallet state for the UI.
// Components must use useAuth() — never useWallet() directly.

"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface AuthContextValue {
  walletConnected:    boolean;
  walletAddress:      string | null;      // short: "CQ1U…dJGdf" — display only
  walletAddressFull:  string | null;      // full base58 — for transactions
  connectWallet:      () => void;         // triggers wallet adapter modal
  disconnect:         () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function shortenAddress(addr: string): string {
  return addr.length <= 9 ? addr : `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, disconnect: walletDisconnect, select } = useWallet();

  const walletAddress = useMemo(
    () => (publicKey ? shortenAddress(publicKey.toBase58()) : null),
    [publicKey]
  );

  const walletAddressFull = useMemo(
    () => (publicKey ? publicKey.toBase58() : null),
    [publicKey]
  );

  const connectWallet = () => {
    // WalletModalProvider handles the modal — this is a no-op hook point
    // ConnectWalletButton triggers the modal directly via useWalletModal()
  };

  const disconnectWallet = async () => {
    await walletDisconnect();
  };

  return (
    <AuthContext.Provider value={{
      walletConnected:   connected,
      walletAddress,
      walletAddressFull,
      connectWallet,
      disconnect:        disconnectWallet,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}