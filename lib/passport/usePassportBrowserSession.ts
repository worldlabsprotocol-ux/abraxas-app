// FILE: lib/passport/usePassportBrowserSession.ts
// Probe HttpOnly browser session before Passport secure actions.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const probeGenerationRef = useRef(0);

  const resolveBrowserSession = useCallback(async (address: string) => {
    const generation = probeGenerationRef.current + 1;
    probeGenerationRef.current = generation;
    setBrowserSessionState("loading");

    try {
      const probed = await probeBrowserSession();
      if (probeGenerationRef.current !== generation) return;

      if (probed) {
        setBrowserSessionState("authenticated");
        return;
      }

      const minted = await ensureBrowserSession(address);
      if (probeGenerationRef.current !== generation) return;

      if (minted.ok && await probeBrowserSession()) {
        if (probeGenerationRef.current !== generation) return;
        setBrowserSessionState("authenticated");
        return;
      }

      if (minted.error?.toLowerCase().includes("oauth session expired")
        || minted.error?.toLowerCase().includes("sign in again")) {
        setBrowserSessionState("reauthentication_required");
        return;
      }

      setBrowserSessionState("reauthentication_required");
    } catch {
      if (probeGenerationRef.current !== generation) return;
      setBrowserSessionState("session_probe_failed");
    }
  }, []);

  const requireReauthentication = useCallback(() => {
    probeGenerationRef.current += 1;
    setBrowserSessionState("reauthentication_required");
  }, []);

  const refreshBrowserSession = useCallback(async () => {
    if (!suiAddress) {
      probeGenerationRef.current += 1;
      setBrowserSessionState("idle");
      return;
    }
    await resolveBrowserSession(suiAddress);
  }, [resolveBrowserSession, suiAddress]);

  useEffect(() => {
    if (authLoading) return;
    if (!suiAddress) {
      probeGenerationRef.current += 1;
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
