// FILE: lib/hooks/usePortfolioIntelligence.ts
// Live portfolio intelligence object.
// Real data: SPL ABRA balance, minted assets from Zustand store.
// Unavailable data: trust score, active loans, health factor — shown as null.
// Never fabricates values. All nulls surface as "Unavailable" in UI.
"use client";

import { useMemo }                        from "react";
import { useAbraStore }                   from "@/lib/abraxasStore";
import { useAbraBalance }                 from "@/lib/hooks/useAbraBalance";
import { useWalletAuth }                  from "@/lib/hooks/useWalletAuth";
import { useWallet }                      from "@solana/wallet-adapter-react";

export type Availability = "live" | "pending" | "unavailable";

export interface IntelligenceField<T> {
  value:  T | null;
  status: Availability;
  label:  string;
}

export interface PortfolioIntelligence {
  wallet:               string | null;
  isAuthenticated:      boolean;

  // Real computed values
  abraBalance:          IntelligenceField<number>;
  verifiedAssetCount:   IntelligenceField<number>;
  totalDeclaredValueUsd:IntelligenceField<number>;
  borrowingPowerUsd:    IntelligenceField<number>;
  abraConsumedTotal:    IntelligenceField<number>;

  // Requires external APIs — null until integrated
  walletTrustScore:     IntelligenceField<number>;
  healthFactor:         IntelligenceField<number>;
  activeLoansUsd:       IntelligenceField<number>;
  liquidationRisk:      IntelligenceField<string>;
  assetQualityScore:    IntelligenceField<number>;
  capitalBehaviorScore: IntelligenceField<number>;
  leverageRatio:        IntelligenceField<number>;

  updatedAt:            number;
}

function live<T>(value:T, label:string): IntelligenceField<T> {
  return { value, status:"live", label };
}
function pending<T>(label:string): IntelligenceField<T> {
  return { value:null, status:"pending", label };
}

export function usePortfolioIntelligence(): PortfolioIntelligence {
  const { publicKey, connected } = useWallet();
  const { isVerified }            = useWalletAuth();
  const assets                    = useAbraStore(s => s.assets);
  const { balance, loading }      = useAbraBalance();

  return useMemo(() => {
    const wallet = publicKey?.toBase58() ?? null;

    // Real computed values
    const verified        = assets.filter(a =>
      ["verified","collateral_eligible","borrowed","listed"].includes(a.status)
    );
    const totalDeclared   = verified.reduce((s,a) => s + a.estimatedUsd, 0);
    const borrowPower     = verified.reduce((s,a) => s + Math.round(a.estimatedUsd * a.ltv / 100), 0);
    const abraConsumed    = assets.reduce((s,a) => s + a.mintCostAbra, 0);

    return {
      wallet,
      isAuthenticated: isVerified,

      abraBalance:           loading ? pending("ABRA Balance")
                             : live(connected ? balance : null, "ABRA Balance"),
      verifiedAssetCount:    live(assets.length, "Tokenized Assets"),
      totalDeclaredValueUsd: totalDeclared > 0 ? live(totalDeclared, "Portfolio Value")
                             : pending("Portfolio Value"),
      borrowingPowerUsd:     borrowPower > 0 ? live(borrowPower, "Borrowing Power")
                             : pending("Borrowing Power"),
      abraConsumedTotal:     abraConsumed > 0 ? live(abraConsumed, "ABRA Spent")
                             : live(0, "ABRA Spent"),

      // External API dependencies — null until Helius/Loopscale integrated
      walletTrustScore:     pending("Trust Score"),
      healthFactor:         pending("Health Factor"),
      activeLoansUsd:       pending("Active Loans"),
      liquidationRisk:      pending("Liquidation Risk"),
      assetQualityScore:    pending("Asset Quality"),
      capitalBehaviorScore: pending("Capital Score"),
      leverageRatio:        pending("Leverage Ratio"),

      updatedAt: Date.now(),
    };
  }, [assets, balance, loading, connected, publicKey, isVerified]);
}