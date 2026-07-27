"use client";
// FILE: components/sui/SuiAuthProvider.tsx
// Sui-native verification identity via zkLogin (replaces Solana wallet on /passport).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadUserSession, clearUserSession, saveUserSession, type ZkLoginUserSession } from "@/lib/sui/zklogin/session";
import { canSignZkLoginTransactions } from "@/lib/sui/zklogin/signingSession";
import { startGoogleZkLogin } from "@/lib/sui/zklogin/startLogin";
import { isZkLoginConfigured } from "@/lib/sui/zklogin/config";
import { truncateSuiAddress, toSuiDid } from "@/lib/sui/identity";

interface SuiAuthContextValue {
  session: ZkLoginUserSession | null;
  suiAddress: string | null;
  suiDid: string | null;
  isAuthenticated: boolean;
  canSignTransactions: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => void;
}

const SuiAuthContext = createContext<SuiAuthContextValue | null>(null);

export function SuiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ZkLoginUserSession | null>(null);
  const [canSignTransactions, setCanSignTransactions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadUserSession();
    setSession(loaded);
    setCanSignTransactions(canSignZkLoginTransactions(loaded?.suiAddress));
    setIsLoading(false);
  }, []);

  const reloadSession = useCallback(() => {
    const loaded = loadUserSession();
    setSession(loaded);
    setCanSignTransactions(canSignZkLoginTransactions(loaded?.suiAddress));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const onSessionChange = () => reloadSession();
    window.addEventListener("abraxas:zklogin-session", onSessionChange);
    window.addEventListener("storage", onSessionChange);
    return () => {
      window.removeEventListener("abraxas:zklogin-session", onSessionChange);
      window.removeEventListener("storage", onSessionChange);
    };
  }, [reloadSession]);

  useEffect(() => {
    setCanSignTransactions(canSignZkLoginTransactions(session?.suiAddress));
    if (session?.suiAddress) {
      void fetch("/api/auth/browser-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sui_address: session.suiAddress }),
      }).catch(() => { /* best-effort */ });
    }
  }, [session]);

  useEffect(() => {
    if (!session?.suiAddress) return;

    void (async () => {
      if (!session.email?.includes("@")) {
        try {
          const res = await fetch("/api/auth/zklogin/me", { credentials: "include" });
          if (res.ok) {
            const data = await res.json() as { email?: string | null };
            if (data.email?.includes("@")) {
              const current = loadUserSession();
              if (current) {
                const updated = { ...current, email: data.email };
                saveUserSession(updated);
                setSession(updated);
              }
            }
          }
        } catch { /* best-effort */ }
      }
    })();
  }, [session?.suiAddress, session?.email]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setError(null);
    const result = await startGoogleZkLogin();
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(() => {
    clearUserSession();
    setSession(null);
    setCanSignTransactions(false);
  }, []);

  const value = useMemo<SuiAuthContextValue>(() => ({
    session,
    suiAddress: session?.suiAddress ?? null,
    suiDid: session?.suiAddress ? toSuiDid(session.suiAddress) : null,
    isAuthenticated: Boolean(session?.suiAddress),
    canSignTransactions,
    isConfigured: isZkLoginConfigured(),
    isLoading,
    error,
    signInWithGoogle,
    signOut,
  }), [session, canSignTransactions, isLoading, error, signInWithGoogle, signOut]);

  return (
    <SuiAuthContext.Provider value={value}>
      {children}
    </SuiAuthContext.Provider>
  );
}

export function useSuiAuth(): SuiAuthContextValue {
  const ctx = useContext(SuiAuthContext);
  if (!ctx) {
    throw new Error("useSuiAuth must be used within SuiAuthProvider");
  }
  return ctx;
}

export function useSuiAuthOptional(): SuiAuthContextValue | null {
  return useContext(SuiAuthContext);
}

export { truncateSuiAddress };
