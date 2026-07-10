"use client";
// FILE: components/sui/SuiAuthProvider.tsx
// Sui-native verification identity via zkLogin (replaces Solana wallet on /passport).
// Server httpOnly cookie is source of truth; localStorage is a display cache only.

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
  saveUserSession,
  type ZkLoginUserSession,
} from "@/lib/sui/zklogin/session";
import {
  ensureBrowserSession,
  probeBrowserSession,
  revokeBrowserSession,
} from "@/lib/auth/ensureBrowserSessionClient";
import { canSignZkLoginTransactions } from "@/lib/sui/zklogin/signingSession";
import { startGoogleZkLogin } from "@/lib/sui/zklogin/startLogin";
import { isZkLoginConfigured } from "@/lib/sui/zklogin/config";
import { truncateSuiAddress, toSuiDid } from "@/lib/sui/identity";

interface SuiAuthContextValue {
  session: ZkLoginUserSession | null;
  suiAddress: string | null;
  suiDid: string | null;
  /** True only when httpOnly browser session cookie is confirmed (not localStorage alone). */
  isAuthenticated: boolean;
  canSignTransactions: boolean;
  isConfigured: boolean;
  /** True until initial cookie probe finishes. */
  isLoading: boolean;
  /** Cookie-backed session confirmed for API calls. */
  hasServerSession: boolean;
  error: string | null;
  signInWithGoogle: (options?: { returnPath?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SuiAuthContext = createContext<SuiAuthContextValue | null>(null);

async function resolveSessionFromCookie(): Promise<{
  session: ZkLoginUserSession | null;
  hasServerSession: boolean;
}> {
  const probe = await probeBrowserSession();
  if (!probe.authenticated || !probe.sui_address) {
    return { session: null, hasServerSession: false };
  }

  const cached = loadUserSession();
  if (cached?.suiAddress === probe.sui_address) {
    return { session: cached, hasServerSession: true };
  }

  const minimal: ZkLoginUserSession = {
    suiAddress: probe.sui_address,
    provider: "google",
    oauthSub: cached?.oauthSub ?? "cookie-session",
    email: cached?.email,
    maxEpoch: cached?.maxEpoch ?? 0,
    loggedInAt: cached?.loggedInAt ?? new Date().toISOString(),
  };
  saveUserSession(minimal);
  return { session: minimal, hasServerSession: true };
}

export function SuiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ZkLoginUserSession | null>(null);
  const [hasServerSession, setHasServerSession] = useState(false);
  const [canSignTransactions, setCanSignTransactions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const cached = loadUserSession();
    const probe = await probeBrowserSession();

    if (probe.authenticated && probe.sui_address) {
      const resolved = await resolveSessionFromCookie();
      setSession(resolved.session);
      setHasServerSession(true);
      setCanSignTransactions(canSignZkLoginTransactions(resolved.session?.suiAddress));
      return;
    }

    if (cached?.suiAddress) {
      const ensured = await ensureBrowserSession(cached.suiAddress);
      if (ensured.ok) {
        const after = await resolveSessionFromCookie();
        setSession(after.session);
        setHasServerSession(after.hasServerSession);
        setCanSignTransactions(canSignZkLoginTransactions(after.session?.suiAddress));
        return;
      }
    }

    if (cached) clearUserSession();
    setSession(null);
    setHasServerSession(false);
    setCanSignTransactions(false);
  }, []);

  useEffect(() => {
    void refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const signInWithGoogle = useCallback(async (options?: { returnPath?: string }) => {
    setError(null);
    const result = await startGoogleZkLogin({ returnPath: options?.returnPath });
    if (!result.ok) setError(result.error);
  }, []);

  const signOut = useCallback(async () => {
    await revokeBrowserSession().catch(() => undefined);
    clearUserSession();
    setSession(null);
    setHasServerSession(false);
    setCanSignTransactions(false);
  }, []);

  const value = useMemo<SuiAuthContextValue>(() => ({
    session,
    suiAddress: session?.suiAddress ?? null,
    suiDid: session?.suiAddress ? toSuiDid(session.suiAddress) : null,
    isAuthenticated: hasServerSession && Boolean(session?.suiAddress),
    canSignTransactions,
    isConfigured: isZkLoginConfigured(),
    isLoading,
    hasServerSession,
    error,
    signInWithGoogle,
    signOut,
    refreshSession,
  }), [
    session,
    hasServerSession,
    canSignTransactions,
    isLoading,
    error,
    signInWithGoogle,
    signOut,
    refreshSession,
  ]);

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
