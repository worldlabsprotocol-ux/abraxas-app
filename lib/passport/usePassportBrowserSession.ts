// FILE: lib/passport/usePassportBrowserSession.ts
// Probe HttpOnly browser session before Passport secure actions.

"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureBrowserSession, probeBrowserSession } from "@/lib/auth/ensureBrowserSession";
import type { PassportBrowserSessionState } from "@/lib/passport/passportBrowserSessionAuth";

export function usePassportBrowserSession(
  suiAddress: string | null,
  authLoading: boolean,
): {
  browserSessionState: PassportBrowserSessionState;
  requireReauthentication: () => void;
  refreshBrowserSession: () => Promise<void>;
} {
  const [browserSessionState, setBrowserSessionState] = useState<PassportBrowserSessionState>(
    suiAddress ? "loading" : "idle",
  );

  const resolveBrowserSession = useCallback(async (address: string) => {
    setBrowserSessionState("loading");

    if (await probeBrowserSession()) {
      setBrowserSessionState("authenticated");
      return;
    }

    const minted = await ensureBrowserSession(address);
    if (minted.ok && await probeBrowserSession()) {
      setBrowserSessionState("authenticated");
      return;
    }

    setBrowserSessionState("reauthentication_required");
  }, []);

  const requireReauthentication = useCallback(() => {
    setBrowserSessionState("reauthentication_required");
  }, []);

  const refreshBrowserSession = useCallback(async () => {
    if (!suiAddress) {
      setBrowserSessionState("idle");
      return;
    }
    await resolveBrowserSession(suiAddress);
  }, [resolveBrowserSession, suiAddress]);

  useEffect(() => {
    if (authLoading) return;
    if (!suiAddress) {
      setBrowserSessionState("idle");
      return;
    }
    void resolveBrowserSession(suiAddress);
  }, [authLoading, resolveBrowserSession, suiAddress]);

  useEffect(() => {
    if (typeof window === "undefined" || !suiAddress) return;

    const onSessionChange = () => {
      void resolveBrowserSession(suiAddress);
    };

    window.addEventListener("abraxas:zklogin-session", onSessionChange);
    return () => {
      window.removeEventListener("abraxas:zklogin-session", onSessionChange);
    };
  }, [resolveBrowserSession, suiAddress]);

  return {
    browserSessionState,
    requireReauthentication,
    refreshBrowserSession,
  };
}
