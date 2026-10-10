"use client";
// FILE: lib/hooks/useHolderSession.ts

import { useCallback, useEffect, useState } from "react";

export type HolderSessionSnapshot = {
  loginMethod: "zklogin" | "solana_wallet";
  solanaAddress: string | null;
  suiAddress: string | null;
  holderAccountId: string | null;
  claimsSubjectKey: string | null;
  passportSubjectReady: boolean;
};

export function useHolderSession(enabled = true) {
  const [session, setSession] = useState<HolderSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/holder-session", { credentials: "include" });
      if (!res.ok) {
        setSession(null);
        return;
      }
      const data = await res.json() as {
        login_method?: string;
        solana_address?: string | null;
        sui_address?: string | null;
        passport_subject_ready?: boolean;
      };
      if (data.login_method === "solana_wallet" || data.login_method === "zklogin") {
        setSession({
          loginMethod: data.login_method,
          solanaAddress: data.solana_address ?? null,
          suiAddress: data.sui_address ?? null,
          holderAccountId: (data as { holder_account_id?: string }).holder_account_id ?? null,
          claimsSubjectKey: (data as { claims_subject_key?: string }).claims_subject_key ?? null,
          passportSubjectReady: Boolean(data.passport_subject_ready),
        });
      } else {
        setSession(null);
      }
    } catch {
      setError("Could not load session");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { session, loading, error, refresh };
}
