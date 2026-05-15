// FILE: lib/abraxasStore.ts
"use client";
// CANONICAL ASSET STATE MACHINE — unified lowercase type.
// Covers all legacy comparisons AND full verification pipeline.
// This is the single source of truth for AssetStatus across all components.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AssetClass =
  | "Spirits" | "Watches" | "Cards (PSA/BGS)" | "Comics (CGC)"
  | "Racehorses" | "Metals" | "Art" | "Other";

// ── CANONICAL 13-STATE VERIFICATION PIPELINE ─────────────────────────────────
// Lowercase throughout — matches all legacy code and new pipeline logic.
// NO UPPER_CASE — was incorrect direction for existing codebase.
export type AssetStatus =
  | "created"               // submitted, awaiting document review
  | "pending_documents"     // document upload in progress
  | "pending_identity"      // ownership identity being verified
  | "pending_appraisal"     // professional appraisal in progress
  | "pending_custody"       // physical custody check in progress
  | "pending_verification"  // final verification queue (legacy compat)
  | "verified"              // fully authenticated — borrow eligible
  | "collateral_eligible"   // active collateral, can borrow against
  | "borrowed"              // has active loan against this asset
  | "listed"                // visible in verified marketplace
  | "rejected"              // failed verification checks
  | "closed";               // lifecycle ended

// Pipeline step number for progress bar (0-12)
export const STATUS_STEP: Record<AssetStatus, number> = {
  created:              1,
  pending_documents:    2,
  pending_identity:     3,
  pending_appraisal:    4,
  pending_custody:      5,
  pending_verification: 6,
  verified:             8,
  collateral_eligible:  9,
  borrowed:            10,
  listed:              11,
  rejected:             0,
  closed:               0,
};

export const STATUS_LABEL: Record<AssetStatus, string> = {
  created:              "Submitted",
  pending_documents:    "Documents Pending",
  pending_identity:     "Identity Verification",
  pending_appraisal:    "Appraisal",
  pending_custody:      "Custody Check",
  pending_verification: "Final Review",
  verified:             "Verified",
  collateral_eligible:  "Borrow Eligible",
  borrowed:             "Active Loan",
  listed:               "Market Ready",
  rejected:             "Rejected",
  closed:               "Closed",
};

export const STATUS_COLOR: Record<AssetStatus, string> = {
  created:              "#C8A96E",
  pending_documents:    "#FBBF24",
  pending_identity:     "#FBBF24",
  pending_appraisal:    "#FBBF24",
  pending_custody:      "#FBBF24",
  pending_verification: "#FBBF24",
  verified:             "#14F195",
  collateral_eligible:  "#14F195",
  borrowed:             "#6b8cff",
  listed:               "#14F195",
  rejected:             "#f26b6b",
  closed:               "rgba(255,255,255,0.2)",
};

export interface AbraAsset {
  id:             string;
  name:           string;
  description:    string;
  assetClass:     AssetClass;
  imagePreview?:  string;
  estimatedUsd:   number;
  ltv:            number;
  custodyPartner: string;
  mintCostAbra:   number;
  txSignature:    string;
  txDeduction?:   string;   // on-chain ABRA deduction tx
  tokenId:        string;
  ownerWallet:    string;
  createdAt:      number;
  status:         AssetStatus;
  grade?:         string;
  year?:          string;
}

interface AbraState {
  abraBalance:   number;
  abraUsdPrice:  number;
  assets:        AbraAsset[];
  mintAsset: (
    asset: Omit<AbraAsset,"id"|"tokenId"|"createdAt"|"status"|"ownerWallet"|"txSignature">,
    wallet: string
  ) => AbraAsset | null;
  updateAssetStatus: (id: string, status: AssetStatus) => void;
  resetDemo: () => void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

// ── Demo pipeline auto-advance (remove in production) ─────────────────────────
const DEMO_PIPELINE: Array<[AssetStatus, number]> = [
  ["pending_documents",    3_000],
  ["pending_identity",     8_000],
  ["pending_appraisal",   15_000],
  ["pending_custody",     22_000],
  ["pending_verification",30_000],
  ["verified",            40_000],
  ["collateral_eligible", 50_000],
];

export const useAbraStore = create<AbraState>()(
  persist(
    (set, get) => ({
      abraBalance:  2850,
      abraUsdPrice: 0.021,
      assets:       [],

      mintAsset(assetData, wallet) {
        const { abraBalance } = get();
        if (abraBalance < assetData.mintCostAbra) return null;

        const asset: AbraAsset = {
          ...assetData,
          id:          uid(),
          tokenId:     `ABRA-${uid().toUpperCase()}`,
          txSignature: `${uid()}${uid()}`.replace(/-/g,""),
          ownerWallet: wallet,
          createdAt:   1748000000000,  // fixed epoch — no SSR mismatch
          status:      "created",
        };

        set(s => ({
          abraBalance: s.abraBalance - assetData.mintCostAbra,
          assets:      [asset, ...s.assets],
        }));

        // Demo auto-advance through verification pipeline
        // In production each transition requires custodian sign-off
        DEMO_PIPELINE.forEach(([status, delay]) => {
          setTimeout(() => {
            set(s => ({
              assets: s.assets.map(a =>
                a.id === asset.id ? { ...a, status } : a
              ),
            }));
          }, delay);
        });

        return asset;
      },

      updateAssetStatus(id, status) {
        set(s => ({
          assets: s.assets.map(a => a.id === id ? { ...a, status } : a),
        }));
      },

      resetDemo() {
        set({ abraBalance:2850, assets:[] });
      },
    }),
    {
      name:          "abraxas-store",
      storage:       createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize:    (s) => ({ abraBalance:s.abraBalance, assets:s.assets }),
    }
  )
);