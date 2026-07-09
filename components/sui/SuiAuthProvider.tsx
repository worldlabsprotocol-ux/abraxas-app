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
import {
  loadUserSession,
  clearUserSession,
  type ZkLoginUserSession,
} from "@/lib/sui/zklogin/session";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSessionClient";
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
  signInWithGoogle: (options?: { returnPath?: string }) => Promise<void>;
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

  useEffect(() => {
    setCanSignTransactions(canSignZkLoginTransactions(session?.suiAddress));
    if (session?.suiAddress) {
      void ensureBrowserSession(session.suiAddress).then(result => {
        if (!result.ok) {
          console.warn("[SuiAuth] browser session sync failed:", result.reason);
        }
      });
    }
  }, [session]);

  const signInWithGoogle = useCallback(async (options?: { returnPath?: string }) => {
    setError(null);
    const result = await startGoogleZkLogin({ returnPath: options?.returnPath });
    if (!result.ok) setError(result.error);
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
