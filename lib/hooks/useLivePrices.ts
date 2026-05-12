// FILE: lib/hooks/useLivePrices.ts
// Live price feed — CoinGecko (crypto) + May 2026 RWA base prices.
// Fetches via /api/prices (server-side, avoids CORS). Updates every 60s.
"use client";
import { useState, useEffect, useCallback } from "react";

export interface LivePrices {
  BTC:    number; ETH:    number; SOL:    number;
  SUI:    number; ABRA:   number;
  GOLD:   number; SILVER: number;
  updatedAt: number;
}

// May 2026 base prices — used as fallback when API unavailable
const BASE: LivePrices = {
  BTC:80635, ETH:2323, SOL:95, SUI:1.27, ABRA:0.021,
  GOLD:4733.39, SILVER:72.91, updatedAt:Date.now(),
};

export function useLivePrices(intervalMs = 60_000) {
  const [prices,  setPrices]  = useState<LivePrices>(BASE);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrices({ ...BASE, ...data, updatedAt: Date.now() });
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message);
      // Keep existing prices on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const iv = setInterval(fetch_, intervalMs);
    return () => clearInterval(iv);
  }, [fetch_, intervalMs]);

  return { prices, loading, error, refetch: fetch_ };
}