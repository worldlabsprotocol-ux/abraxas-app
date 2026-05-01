"use client";

import { useState, useEffect, useCallback } from "react";
import { mockVaults, systemStats } from "@/lib/mockData";

export const VAULT_YIELD_RATES: Record<string, number> = {
  "490": 12.8, "491": 11.4, "492": 6.2, "493": 9.1, "494": 8.6,
};

// Vault weights for TVL allocation when using live wallet balance
const VAULT_WEIGHTS: Record<string, number> = {
  "490": 0.22, "491": 0.14, "492": 0.50, "493": 0.10, "494": 0.04,
};

// When no wallet is connected, display real static TVLs from mockData
// AUM = sum of all vault TVLs (no multiplier — honest number)
const STATIC_SYSTEM_AUM = mockVaults.reduce((s, v) => s + v.tvl, 0);

const FALLBACK_SOL_PRICE   = 145;
const FALLBACK_WALLET_USD  = 0; // show $0 when not connected, not a fake number

async function fetchSolPrice(): Promise<number> {
  try {
    const res  = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { next: { revalidate: 300 } });
    const data = await res.json();
    return data?.solana?.usd ?? FALLBACK_SOL_PRICE;
  } catch {
    return FALLBACK_SOL_PRICE;
  }
}

export interface VaultPosition {
  vaultId:     string;
  vaultName:   string;
  tvl:         number;
  yieldRate:   number;
  annualYield: number;
  deposited:   number;
  agentId:     string;
}

export interface PortfolioData {
  sol:             number;
  abra:            number;
  solValueUSD:     number;
  abraValueUSD:    number;
  walletValueUSD:  number;
  vaultPositions:  VaultPosition[];
  totalVaultTVL:   number;
  portfolioValue:  number;
  availableCapital:number;
  systemAUM:       number;
  systemAUMSource: "live" | "static"; // tells UI whether this is real or static
  loading:         boolean;
  error:           string | null;
  refresh:         () => void;
  updatedAt:       string | null;
}

export function usePortfolioData(): PortfolioData {
  const [solPrice, setSolPrice] = useState(FALLBACK_SOL_PRICE);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [updatedAt,setUpdatedAt]= useState<string | null>(null);

  // SOL holdings from vault authority wallet (illustrative — real balance via RPC)
  const sol  = 0.05; // funded vault authority
  const abra = 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const price = await fetchSolPrice();
      setSolPrice(price);
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError("Price fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const solValueUSD  = sol  * solPrice;
  const abraValueUSD = abra * 0.000054599;
  const walletValueUSD = solValueUSD + abraValueUSD;

  // Vault positions from static TVLs — honest, matches marketplace cards
  const vaultPositions: VaultPosition[] = mockVaults.map((v) => {
    const yieldRate   = VAULT_YIELD_RATES[v.id] ?? v.yieldYTD;
    const tvl         = v.tvl; // use real static TVL, not multiplied
    const deposited   = Math.round(tvl * 0.18); // ~18% average deposit ratio
    const annualYield = Math.round(tvl * yieldRate / 100);
    return { vaultId: v.id, vaultName: v.name, tvl, yieldRate, annualYield, deposited, agentId: v.agentId };
  });

  const totalVaultTVL    = vaultPositions.reduce((s, p) => s + p.tvl, 0);
  const portfolioValue   = walletValueUSD + totalVaultTVL;
  const availableCapital = Math.round(walletValueUSD * 0.35);

  // systemAUM = honest sum of vault TVLs
  // No multipliers, no 68x. What you see in marketplace = what you see on homepage.
  const systemAUM = STATIC_SYSTEM_AUM;

  return {
    sol, abra, solValueUSD, abraValueUSD, walletValueUSD,
    vaultPositions, totalVaultTVL, portfolioValue,
    availableCapital, systemAUM,
    systemAUMSource: "static",
    loading, error, refresh: load,
    updatedAt,
  };
}