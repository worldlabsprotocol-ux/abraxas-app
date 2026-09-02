"use client";
// FILE: components/sui/SuiAuthProvider.tsx
// Single source of truth for zkLogin auth state — mount once at app root only.

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
import { startGoogleZkLogin, clearStaleLoginInFlight } from "@/lib/sui/zklogin/startLogin";
import { isZkLoginConfigured, isLegacyZkLoginRecoveryConfigured } from "@/lib/sui/zklogin/config";
import { truncateSuiAddress, toSuiDid } from "@/lib/sui/identity";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSession";
import { logAuthEvent } from "@/lib/sui/zklogin/authDebug";
import {
  clearSignInRecovery,
  loadSignInRecovery,
  parseSignInRecoveryFromSearchParams,
  saveSignInRecovery,
  SIGN_IN_ERROR_QUERY,
  SUGGESTED_LOGIN_MODE_QUERY,
  type SignInRecoveryState,
} from "@/lib/sui/zklogin/signInRecovery";

interface SuiAuthContextValue {
  session: ZkLoginUserSession | null;
  suiAddress: string | null;
  suiDid: string | null;
  isAuthenticated: boolean;
  canSignTransactions: boolean;
  isConfigured: boolean;
  isLegacyRecoveryConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  signInRecovery: SignInRecoveryState | null;
  dismissSignInRecovery: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithExistingAccount: () => Promise<boolean>;
  signOut: () => void;
  refreshSession: () => void;
}

const SuiAuthContext = createContext<SuiAuthContextValue | null>(null);

function readSessionFromStorage(): ZkLoginUserSession | null {
  if (typeof window === "undefined") return null;
  return loadUserSession();
}

export function SuiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ZkLoginUserSession | null>(readSessionFromStorage);
  const [canSignTransactions, setCanSignTransactions] = useState(() =>
    canSignZkLoginTransactions(readSessionFromStorage()?.suiAddress),
  );
  const [isLoading, setIsLoading] = useState(() => typeof window === "undefined");
  const [error, setError] = useState<string | null>(null);
  const [signInRecovery, setSignInRecovery] = useState<SignInRecoveryState | null>(null);

  const dismissSignInRecovery = useCallback(() => {
    clearSignInRecovery();
    setSignInRecovery(null);
  }, []);

  const reloadSession = useCallback(() => {
    clearStaleLoginInFlight();
    const loaded = loadUserSession();
    setSession(loaded);
    const signingReady = canSignZkLoginTransactions(loaded?.suiAddress);
    setCanSignTransactions(signingReady);
    setIsLoading(false);
    logAuthEvent("session_loaded", {
      hasSigning: signingReady,
    });
    if (loaded?.suiAddress) {
      logAuthEvent("auth_provider_authenticated", { authenticated: true });
    }
    logAuthEvent("auth_provider_ready", { ready: true });
  }, []);

  useEffect(() => {
    reloadSession();
  }, [reloadSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseSignInRecoveryFromSearchParams(params);
    if (fromUrl) {
      saveSignInRecovery(fromUrl);
      setSignInRecovery(fromUrl);
      params.delete(SIGN_IN_ERROR_QUERY);
      params.delete(SUGGESTED_LOGIN_MODE_QUERY);
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState(null, "", next);
      return;
    }

    const stored = loadSignInRecovery();
    if (stored) setSignInRecovery(stored);
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
    const signingReady = canSignZkLoginTransactions(session?.suiAddress);
    setCanSignTransactions(signingReady);
    if (session?.suiAddress) {
      logAuthEvent(signingReady ? "wallet_signing_ready" : "wallet_signing_missing", {
        hasSigning: signingReady,
      });
      void ensureBrowserSession(session.suiAddress);
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
    dismissSignInRecovery();
    const result = await startGoogleZkLogin({ mode: "canonical" });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }, [dismissSignInRecovery]);

  const signInWithExistingAccount = useCallback(async (): Promise<boolean> => {
    setError(null);
    dismissSignInRecovery();
    const result = await startGoogleZkLogin({ mode: "legacy_recovery" });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }, [dismissSignInRecovery]);

  const signOut = useCallback(() => {
    clearUserSession();
    setSession(null);
    setCanSignTransactions(false);
    logAuthEvent("session_cleared");
    void fetch("/api/auth/browser-session", { method: "DELETE", credentials: "include" }).catch(() => {});
  }, []);

  const value = useMemo<SuiAuthContextValue>(() => ({
    session,
    suiAddress: session?.suiAddress ?? null,
    suiDid: session?.suiAddress ? toSuiDid(session.suiAddress) : null,
    isAuthenticated: Boolean(session?.suiAddress),
    canSignTransactions,
    isConfigured: isZkLoginConfigured(),
    isLegacyRecoveryConfigured: isLegacyZkLoginRecoveryConfigured(),
    isLoading,
    error,
    signInRecovery,
    dismissSignInRecovery,
    signInWithGoogle,
    signInWithExistingAccount,
    signOut,
    refreshSession: reloadSession,
  }), [session, canSignTransactions, isLoading, error, signInRecovery, dismissSignInRecovery, signInWithGoogle, signInWithExistingAccount, signOut, reloadSession]);

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
