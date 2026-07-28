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
import { isZkLoginConfigured } from "@/lib/sui/zklogin/config";
import { truncateSuiAddress, toSuiDid } from "@/lib/sui/identity";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSession";
import { logAuthEvent } from "@/lib/sui/zklogin/authDebug";
import { readLocalZkLoginEmail, resolveZkLoginEmail } from "@/lib/sui/zklogin/resolveEmail";

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

  const reloadSession = useCallback(() => {
    clearStaleLoginInFlight();
    const loaded = loadUserSession();
    setSession(loaded);
    const signingReady = canSignZkLoginTransactions(loaded?.suiAddress);
    setCanSignTransactions(signingReady);
    setIsLoading(false);
    logAuthEvent("session_loaded", {
      suiAddress: loaded?.suiAddress ?? null,
      hasSigning: signingReady,
    });
    if (loaded?.suiAddress) {
      logAuthEvent("auth_provider_authenticated", { suiAddress: loaded.suiAddress });
    }
    logAuthEvent("auth_provider_ready", { suiAddress: loaded?.suiAddress ?? null });
  }, []);

  useEffect(() => {
    reloadSession();
  }, [reloadSession]);

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
        suiAddress: session.suiAddress,
        hasSigning: signingReady,
      });
      void ensureBrowserSession(session.suiAddress);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.suiAddress) return;

    void (async () => {
      if (session.email?.includes("@")) return;

      const local = readLocalZkLoginEmail();
      if (local) {
        const current = loadUserSession();
        if (current && current.email !== local) {
          const updated = { ...current, email: local };
          saveUserSession(updated);
          setSession(updated);
        }
        return;
      }

      const resolved = await resolveZkLoginEmail(session.suiAddress);
      if (resolved) {
        const current = loadUserSession();
        if (current) {
          setSession({ ...current, email: resolved });
        }
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
    isLoading,
    error,
    signInWithGoogle,
    signOut,
    refreshSession: reloadSession,
  }), [session, canSignTransactions, isLoading, error, signInWithGoogle, signOut, reloadSession]);

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
