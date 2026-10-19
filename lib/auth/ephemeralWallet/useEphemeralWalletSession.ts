"use client";
// FILE: lib/auth/ephemeralWallet/useEphemeralWalletSession.ts

import { useCallback, useEffect, useState } from "react";
import {
  EPHEMERAL_WALLET_SESSION_EVENT,
  fetchEphemeralWalletClientSession,
  type EphemeralWalletClientSession,
} from "./clientSession";

export type EphemeralWalletSessionStatus =
  | "loading"
  | "signed_out"
  | "authenticated"
  | "unavailable";

export function useEphemeralWalletSession(): EphemeralWalletClientSession & {
  status: EphemeralWalletSessionStatus;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
} {
  const [status, setStatus] = useState<EphemeralWalletSessionStatus>("loading");
  const [session, setSession] = useState<EphemeralWalletClientSession>({
    authenticated: false,
    walletAddress: null,
    sessionId: null,
    expiresAt: null,
  });

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setStatus("loading");
    try {
      const next = await fetchEphemeralWalletClientSession();
      setSession(next);
      setStatus(next.authenticated ? "authenticated" : "signed_out");
    } catch {
      setSession({
        authenticated: false,
        walletAddress: null,
        sessionId: null,
        expiresAt: null,
      });
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSession = () => void refresh({ silent: true });
    window.addEventListener(EPHEMERAL_WALLET_SESSION_EVENT, onSession);
    window.addEventListener("abraxas:native-account-session", onSession);
    return () => {
      window.removeEventListener(EPHEMERAL_WALLET_SESSION_EVENT, onSession);
      window.removeEventListener("abraxas:native-account-session", onSession);
    };
  }, [refresh]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  return { ...session, status, refresh };
}
