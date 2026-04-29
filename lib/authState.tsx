"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession, signOut } from "next-auth/react";

interface AuthContextValue {
  loggedIn: boolean;
  walletConnected: boolean;
  loginMethod: string | null;
  walletAddress: string | null;      // shortened for display: "CQ1U…dJGdf"
  walletAddressFull: string | null;  // FULL base58 for transactions
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  loginWithProvider: (provider: "google" | "github") => Promise<void>;
  connectWallet: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function shortenAddress(addr: string): string {
  if (addr.length <= 9) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, disconnect } = useWallet();
  const { data: session } = useSession();
  const [walletMethod, setWalletMethod] = useState<string | null>(null);

  useEffect(() => {
    if (connected && !walletMethod) setWalletMethod("Wallet");
    if (!connected) setWalletMethod(null);
  }, [connected, walletMethod]);

  // SHORT address for display only
  const walletAddress = useMemo(
    () => (publicKey ? shortenAddress(publicKey.toBase58()) : null),
    [publicKey]
  );

  // FULL address for on-chain use — never shortened
  const walletAddressFull = useMemo(
    () => (publicKey ? publicKey.toBase58() : null),
    [publicKey]
  );

  const loggedIn = Boolean(session?.user) || connected;
  const loginMethod = session?.user ? "Account" : walletMethod ?? null;

  const loginWithProvider = async (provider: "google" | "github") => {
    const { signIn } = await import("next-auth/react");
    await signIn(provider, { callbackUrl: "/app" });
  };

  const connectWallet = () => {};

  const logout = async () => {
    if (connected) await disconnect();
    if (session) await signOut({ redirect: false });
  };

  return (
    <AuthContext.Provider value={{
      loggedIn, walletConnected: connected, loginMethod,
      walletAddress, walletAddressFull,
      user: session?.user ?? null,
      loginWithProvider, connectWallet, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}