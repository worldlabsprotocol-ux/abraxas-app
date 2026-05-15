// FILE: lib/abraxasStore.ts
// MINIMAL STORE — only what mint flow needs.
// No vault routing. No Supabase. No treasury logic.
// Single source of truth for: ABRA balance, minted assets.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AssetClass = "Spirits"|"Watches"|"Cards (PSA/BGS)"|"Comics (CGC)"|"Racehorses"|"Metals"|"Art"|"Other";
// Full 9-state verification pipeline
export type AssetStatus =
  | "SUBMITTED"             // asset submitted, awaiting metadata review
  | "SIGNATURE_VERIFIED"    // wallet ownership confirmed via signed message
  | "OWNERSHIP_VERIFIED"    // documentation and provenance reviewed
  | "CUSTODY_PENDING"       // custody partner notified, awaiting physical check
  | "CUSTODY_CONFIRMED"     // physical inspection confirmed by custody partner
  | "APPRAISAL_PENDING"     // appraisal / liquidity analysis in progress
  | "LIQUIDITY_SCORED"      // liquidity and valuation confidence established
  | "COLLATERAL_ELIGIBLE"   // ready for USDC borrowing via Loopscale
  | "MARKET_LISTED";        // visible in verified asset marketplace

// Legacy status aliases (for backward compatibility with older assets)
export type AssetStatusLegacy = "pending_verification"|"verified"|"listed"|"closed";

export interface AbraAsset {
  id:            string;
  name:          string;
  description:   string;
  assetClass:    AssetClass;
  imagePreview?: string;       // undefined = no image
  estimatedUsd:  number;
  ltv:           number;
  custodyPartner:string;
  mintCostAbra:  number;
  txSignature:   string;
  tokenId:       string;
  ownerWallet:   string;
  createdAt:     number;       // fixed epoch — no Date.now() in render
  status:        AssetStatus;
  grade?:        string;
  year?:         string;
  txDeduction?:  string;   // on-chain tx signature for ABRA deduction
  deductedAt?:   number;   // timestamp of confirmed on-chain deduction
}

interface AbraState {
  abraBalance:   number;
  abraUsdPrice:  number;
  assets:        AbraAsset[];
  mintAsset: (
    asset: Omit<AbraAsset,"id"|"tokenId"|"createdAt"|"status"|"ownerWallet"|"txSignature">,
    wallet: string
  ) => AbraAsset | null;
  resetDemo: () => void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export const useAbraStore = create<AbraState>()(
  persist(
    (set, get) => ({
      abraBalance:  2850,
      abraUsdPrice: 0.021,
      assets:       [],

      mintAsset(assetData, wallet) {
        const { abraBalance } = get();
        const cost = assetData.mintCostAbra;
        if (abraBalance < cost) return null;

        const asset: AbraAsset = {
          ...assetData,
          id:          uid(),
          tokenId:     `ABRA-${uid().toUpperCase()}`,
          txSignature: `${uid()}${uid()}`.replace(/-/g,""),
          ownerWallet: wallet,
          createdAt:   1748000000000, // fixed epoch — no SSR mismatch
          status:      "SUBMITTED",
        };

        set(s => ({
          abraBalance: s.abraBalance - cost,
          assets:      [asset, ...s.assets],
        }));

        // Auto-advance to listed after 18s (demo)
        // Auto-advance through pipeline (demo mode only)
        // In production each state requires real custodian sign-off
        const advance = (id:string, toStatus:AssetStatus, delay:number) =>
          setTimeout(()=>set(s=>({assets:s.assets.map(a=>
            a.id===id?{...a,status:toStatus}:a)})), delay);
        advance(asset.id, "SIGNATURE_VERIFIED",   3_000);
        advance(asset.id, "OWNERSHIP_VERIFIED",   8_000);
        advance(asset.id, "CUSTODY_PENDING",     14_000);
        advance(asset.id, "CUSTODY_CONFIRMED",   28_000);
        advance(asset.id, "APPRAISAL_PENDING",   35_000);
        advance(asset.id, "LIQUIDITY_SCORED",    42_000);
        advance(asset.id, "COLLATERAL_ELIGIBLE", 50_000);

        return asset;
      },

      resetDemo() {
        set({ abraBalance: 2850, assets: [] });
      },
    }),
    {
      name:           "abraxas-store",
      storage:        createJSONStorage(() => localStorage),
      skipHydration:  true,   // manual rehydrate in StoreHydrator to prevent SSR mismatch
      partialize:     (s) => ({ abraBalance: s.abraBalance, assets: s.assets }),
    }
  )
);