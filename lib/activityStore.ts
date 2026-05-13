// FILE: lib/abraxasStore.ts
// MINIMAL STORE — only what mint flow needs.
// No vault routing. No Supabase. No treasury logic.
// Single source of truth for: ABRA balance, minted assets.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AssetClass = "Spirits"|"Watches"|"Cards (PSA/BGS)"|"Comics (CGC)"|"Racehorses"|"Metals"|"Art"|"Other";
export type AssetStatus = "pending_verification"|"verified"|"listed";

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
          status:      "pending_verification",
        };

        set(s => ({
          abraBalance: s.abraBalance - cost,
          assets:      [asset, ...s.assets],
        }));

        // Auto-advance to listed after 18s (demo)
        setTimeout(() => {
          set(s => ({
            assets: s.assets.map(a =>
              a.id === asset.id ? { ...a, status: "listed" } : a
            ),
          }));
        }, 18_000);

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