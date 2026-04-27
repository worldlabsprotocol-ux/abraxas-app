"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface WalletBalances {
  sol: number | null;
  abra: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches SOL + $ABRA balances via our own server-side API route.
 *
 * WHY SERVER-SIDE:
 * - Avoids client-side RPC rate limiting entirely
 * - Server uses SOLANA_RPC_URL (private env), not the public fallback
 * - Much more reliable than browser → mainnet-beta.solana.com
 */
export function useWalletBalances(): WalletBalances {
  const { publicKey, connected } = useWallet();

  const [sol, setSol] = useState<number | null>(null);
  const [abra, setAbra] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!connected || !publicKey) {
      setSol(null);
      setAbra(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/solana/balances?wallet=${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error ?? "Failed to fetch balances");
          return;
        }
        setSol(data.sol ?? null);
        setAbra(data.abra ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[balances]", err);
        setError("Failed to fetch balances");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [publicKey, connected, refreshKey]);

  return { sol, abra, loading, error, refresh };
}
