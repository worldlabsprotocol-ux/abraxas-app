"use client";

import { useEffect } from "react";
import { useWalletBalances } from "@/lib/useWalletBalances";
import { mockVaults, systemStats } from "@/lib/mockData";

const SOL_PRICE_USD = 145;
const ABRA_PRICE_USD = 0.000054599;

const VAULT_WEIGHTS: Record<string, number> = {
  "490": 0.38,
  "491": 0.23,
  "492": 0.21,
  "493": 0.11,
  "494": 0.07,
};

const LEVERAGE = 4.2;

export const VAULT_YIELD_RATES: Record<string, number> = {
  "490": 12.8,
  "491": 11.4,
  "492": 6.2,
  "493": 9.1,
  "494": 8.6,
};

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

/** Safe fallback — always fully defined, never undefined. */
const EMPTY: PortfolioData = {
  sol: null,
  abra: null,
  solValueUSD: 0,
  abraValueUSD: 0,
  walletValueUSD: 0,
  vaultPositions: mockVaults.map((v) => ({
    vaultId: v.id,
    vaultName: v.name,
    tvl: v.tvl,
    yieldRate: VAULT_YIELD_RATES[v.id] ?? 9.0,
    annualYield: Math.round(v.tvl * (VAULT_YIELD_RATES[v.id] ?? 9.0) / 100),
    deposited: Math.round(v.tvl / LEVERAGE),
    agentId: v.agentId,
  })),
  totalVaultTVL: mockVaults.reduce((s, v) => s + v.tvl, 0),
  portfolioValue: mockVaults.reduce((s, v) => s + v.tvl, 0),
  yieldGenerated: 0,
  availableCapital: 0,
  activePositions: mockVaults.length,
  systemAUM: systemStats.totalAUM,
  loading: true,
  error: null,
  refresh: () => {},
  solPrice: SOL_PRICE_USD,
  abraPrice: ABRA_PRICE_USD,
};

export function usePortfolioData(): PortfolioData {
  const { sol, abra, loading, error, refresh } = useWalletBalances();

  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const solValueUSD = (sol ?? 0) * SOL_PRICE_USD;
  const abraValueUSD = (abra ?? 0) * ABRA_PRICE_USD;
  const walletValueUSD = solValueUSD + abraValueUSD;
  const base = walletValueUSD > 0 ? walletValueUSD : FALLBACK_WALLET_USD;

  const vaultPositions: VaultPosition[] = mockVaults.map((v) => {
    const weight = VAULT_WEIGHTS[v.id] ?? 0.1;
    const tvl = Math.round(base * LEVERAGE * weight);
    const deposited = Math.round(tvl / LEVERAGE);
    const yieldRate = VAULT_YIELD_RATES[v.id] ?? 9.0;
    const annualYield = Math.round(tvl * yieldRate / 100);
    return {
      vaultId: v.id,
      vaultName: v.name,
      tvl,
      yieldRate,
      annualYield,
      deposited,
      agentId: v.agentId,
    };
  });

  const totalVaultTVL = vaultPositions.reduce((s, p) => s + p.tvl, 0);
  const portfolioValue = walletValueUSD + totalVaultTVL;
  const yieldGenerated = Math.round(
    vaultPositions.reduce((s, p) => s + p.annualYield * 0.6, 0)
  );
  const availableCapital = Math.round(walletValueUSD * 0.35);
  const systemAUM = Math.round(portfolioValue * 68) || systemStats.totalAUM;

  return {
    sol,
    abra,
    solValueUSD,
    abraValueUSD,
    walletValueUSD,
    vaultPositions,
    totalVaultTVL,
    portfolioValue: portfolioValue || EMPTY.portfolioValue,
    yieldGenerated: yieldGenerated || 0,
    availableCapital: availableCapital || 0,
    activePositions: vaultPositions.filter((p) => p.tvl > 0).length,
    systemAUM,
    loading,
    error,
    refresh,
    solPrice: SOL_PRICE_USD,
    abraPrice: ABRA_PRICE_USD,
  };
}