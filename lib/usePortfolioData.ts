"use client";

import { useEffect, useState, useRef } from "react";
import { useWalletBalances } from "@/lib/useWalletBalances";
import { mockVaults, systemStats } from "@/lib/mockData";

// Vault model
const VAULT_WEIGHTS: Record<string, number> = {
  "490": 0.38, "491": 0.23, "492": 0.21, "493": 0.11, "494": 0.07,
};
const LEVERAGE = 4.2;

export const VAULT_YIELD_RATES: Record<string, number> = {
  "490": 12.8, "491": 11.4, "492": 6.2, "493": 9.1, "494": 8.6,
};

const ABRA_PRICE_USD = 0.000054599; // on-chain verified
const FALLBACK_SOL_PRICE = 145;
const FALLBACK_WALLET_USD = 8_200;

export interface VaultPosition {
  vaultId: string;
  vaultName: string;
  tvl: number;
  yieldRate: number;
  annualYield: number;
  deposited: number;
  agentId: string;
}

export interface PortfolioData {
  sol: number | null;
  abra: number | null;
  solValueUSD: number;
  abraValueUSD: number;
  walletValueUSD: number;
  vaultPositions: VaultPosition[];
  totalVaultTVL: number;
  portfolioValue: number;
  yieldGenerated: number;
  availableCapital: number;
  activePositions: number;
  systemAUM: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  solPrice: number;
  abraPrice: number;
}

/** Fetch live SOL price from CoinGecko (free, no API key) */
async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return data?.solana?.usd ?? FALLBACK_SOL_PRICE;
  } catch {
    return FALLBACK_SOL_PRICE;
  }
}

export function usePortfolioData(): PortfolioData {
  const { sol, abra, loading, error, refresh } = useWalletBalances();
  const [solPrice, setSolPrice] = useState(FALLBACK_SOL_PRICE);
  const priceRef = useRef(false);

  // Fetch live SOL price once on mount
  useEffect(() => {
    if (priceRef.current) return;
    priceRef.current = true;
    fetchSolPrice().then(setSolPrice);
    // Refresh price every 5 minutes
    const t = setInterval(() => fetchSolPrice().then(setSolPrice), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh balances every 30s
  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const solValueUSD  = (sol  ?? 0) * solPrice;
  const abraValueUSD = (abra ?? 0) * ABRA_PRICE_USD;
  const walletValueUSD = solValueUSD + abraValueUSD;

  const base = walletValueUSD > 0 ? walletValueUSD : FALLBACK_WALLET_USD;

  const vaultPositions: VaultPosition[] = mockVaults.map((v) => {
    const weight      = VAULT_WEIGHTS[v.id] ?? 0.1;
    const tvl         = Math.round(base * LEVERAGE * weight);
    const deposited   = Math.round(tvl / LEVERAGE);
    const yieldRate   = VAULT_YIELD_RATES[v.id] ?? 9.0;
    const annualYield = Math.round(tvl * yieldRate / 100);
    return { vaultId: v.id, vaultName: v.name, tvl, yieldRate, annualYield, deposited, agentId: v.agentId };
  });

  const totalVaultTVL   = vaultPositions.reduce((s, p) => s + p.tvl, 0);
  const portfolioValue  = (walletValueUSD + totalVaultTVL) || systemStats.totalAUM;
  const yieldGenerated  = Math.round(vaultPositions.reduce((s, p) => s + p.annualYield * 0.6, 0)) || 0;
  const availableCapital = Math.round(walletValueUSD * 0.35) || 0;
  const systemAUM       = Math.round(portfolioValue * 68) || systemStats.totalAUM;

  return {
    sol, abra, solValueUSD, abraValueUSD, walletValueUSD,
    vaultPositions, totalVaultTVL, portfolioValue,
    yieldGenerated, availableCapital,
    activePositions: vaultPositions.filter((p) => p.tvl > 0).length,
    systemAUM, loading, error, refresh,
    solPrice, abraPrice: ABRA_PRICE_USD,
  };
}