// FILE: lib/abraxasStore.ts
// Zustand state machine — single source of truth for Abraxas asset lifecycle
// Assets: created → pending_soft → verified → listed → collateral_eligible → borrowed → closed
// $ABRA balance tracked here; deducted on mint; Markets + Vaults read from this store.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AssetStatus =
  | "created"
  | "pending_soft"       // instant: visible in Markets as "pending"
  | "pending_standard"   // 0–24h: becoming verified
  | "verified"
  | "listed"             // tradable in Markets
  | "collateral_eligible"
  | "borrowed"
  | "closed";

export type EventType =
  | "ASSET_TOKENIZED"
  | "ASSET_VERIFIED"
  | "ASSET_LISTED"
  | "POSITION_CREATED"
  | "POSITION_UPDATED"
  | "VAULT_UPDATED"
  | "ABRA_DEDUCTED";

export interface AbraAsset {
  id:              string;
  tokenId:         string;
  ownerWallet:     string;
  name:            string;
  description:     string;
  assetClass:      string;
  status:          AssetStatus;
  mintCostAbra:    number;
  txSignature:     string;
  imagePreview?:   string;
  estimatedUsd:    number;
  ltv:             number;
  custodyPartner:  string;
  createdAt:       number;
  verifiedAt?:     number;
  listedAt?:       number;
  grade?:          string;
  year?:           string;
  serialNumber?:   string;
}

export interface AbraPosition {
  id:            string;
  wallet:        string;
  assetId:       string;
  positionType:  "mint"|"collateral"|"borrow";
  exposureValue: number;
  ltvRatio:      number;
  riskScore:     number;
  createdAt:     number;
}

export interface AbraEvent {
  id:          string;
  eventType:   EventType;
  assetId?:    string;
  wallet:      string;
  txSignature?: string;
  payload:     Record<string,unknown>;
  timestamp:   number;
}

interface AbraState {
  // $ABRA balance (tracks deductions in-session + simulated persistent balance)
  abraBalance:    number;
  abraUsdPrice:   number;

  // Asset registry
  assets:         AbraAsset[];

  // Positions (capital layer)
  positions:      AbraPosition[];

  // Event stream
  events:         AbraEvent[];

  // Protocol metrics
  totalTVL:       number;
  totalMinted:    number;
  totalVerified:  number;

  // Actions
  setAbraBalance: (n: number) => void;
  deductAbra:     (amount: number, reason: string, wallet: string) => boolean;
  mintAsset:      (asset: Omit<AbraAsset,"id"|"tokenId"|"createdAt"|"status"|"ownerWallet"|"txSignature">, wallet: string) => AbraAsset | null;
  advanceStatus:  (assetId: string, to: AssetStatus) => void;
  addPosition:    (p: Omit<AbraPosition,"id"|"createdAt">) => void;
  emitEvent:      (e: Omit<AbraEvent,"id"|"timestamp">) => void;
  getListedAssets:() => AbraAsset[];
  getPendingAssets:()=> AbraAsset[];
  getPositionsFor:(wallet: string) => AbraPosition[];
  getTVL:         () => number;
  resetDemo:      () => void;
}

// ─── Seeded demo assets in Markets (verified + listed) ────────────────────────
const SEED_ASSETS: AbraAsset[] = [
  {
    id:"seed-1", tokenId:"Abrax1BGAQ2ywQch3rSxaFvNxMjNXpFmKX7uHkGx",
    ownerWallet:"7xA3...mK9f", name:"1999 Pokémon Charizard Holo 1st Edition",
    description:"PSA 10 Gem Mint. Population: 122. Heritage Q4 2024 comp: $596,000.",
    assetClass:"Cards (PSA/BGS)", status:"listed",
    mintCostAbra:80, txSignature:"5nzK...bH2m",
    estimatedUsd:550000, ltv:55, custodyPartner:"Collector Crypt",
    createdAt:Date.now()-8640000*7, verifiedAt:Date.now()-8640000*5,
    listedAt:Date.now()-8640000*4, grade:"PSA 10", year:"1999",
  },
  {
    id:"seed-2", tokenId:"Abrax2BGAQ3ywQch4rSxaFvNxMjNXpFmKX7uHkGy",
    ownerWallet:"Db6R...xQ2p", name:"Pappy Van Winkle 2021 20 Year",
    description:"Baxus-authenticated. 750ml. Secondary: $2,400.",
    assetClass:"Spirits", status:"listed",
    mintCostAbra:100, txSignature:"7mzK...cH3n",
    estimatedUsd:2400, ltv:55, custodyPartner:"Baxus",
    createdAt:Date.now()-8640000*5, verifiedAt:Date.now()-8640000*3,
    listedAt:Date.now()-8640000*2, grade:"Baxus Verified", year:"2021",
  },
  {
    id:"seed-3", tokenId:"Abrax3BGAQ4ywQch5rSxaFvNxMjNXpFmKX7uHkGz",
    ownerWallet:"9G4k...Fa2m", name:"Amazing Fantasy #15 (1962) CGC 7.5",
    description:"First appearance of Spider-Man. CGC 7.5 VF-. Certified.",
    assetClass:"Comics (CGC)", status:"listed",
    mintCostAbra:120, txSignature:"9kzK...dH4o",
    estimatedUsd:525000, ltv:65, custodyPartner:"Metropolis",
    createdAt:Date.now()-8640000*10, verifiedAt:Date.now()-8640000*8,
    listedAt:Date.now()-8640000*7, grade:"CGC 7.5", year:"1962",
  },
  {
    id:"seed-4", tokenId:"Abrax4BGAQ5ywQch6rSxaFvNxMjNXpFmKX7uHkHA",
    ownerWallet:"HeFq...wZq5", name:"Rolex Submariner Ref 6538 (1958)",
    description:"Courtyard vault custody. Big Crown. All original.",
    assetClass:"Watches", status:"listed",
    mintCostAbra:150, txSignature:"2pzK...eH5p",
    estimatedUsd:95000, ltv:65, custodyPartner:"Courtyard",
    createdAt:Date.now()-8640000*14, verifiedAt:Date.now()-8640000*12,
    listedAt:Date.now()-8640000*11, grade:"All Original", year:"1958",
  },
  {
    id:"seed-5", tokenId:"Abrax5BGAQ6ywQch7rSxaFvNxMjNXpFmKX7uHkHB",
    ownerWallet:"CQ1U...dJGd", name:"Gold 1oz LBMA (999.9 Fine)",
    description:"LBMA certified. 999.9 fine. Spot: $3,232.",
    assetClass:"Metals", status:"listed",
    mintCostAbra:60, txSignature:"3qzK...fH6q",
    estimatedUsd:3232, ltv:80, custodyPartner:"LBMA",
    createdAt:Date.now()-8640000*3, verifiedAt:Date.now()-8640000*2,
    listedAt:Date.now()-8640000*1, grade:"LBMA 999.9", year:"2026",
  },
];

const SEED_POSITIONS: AbraPosition[] = [
  { id:"pos-1", wallet:"7xA3...mK9f", assetId:"seed-1", positionType:"collateral", exposureValue:302500, ltvRatio:55, riskScore:22, createdAt:Date.now()-8640000*4 },
  { id:"pos-2", wallet:"Db6R...xQ2p", assetId:"seed-2", positionType:"collateral", exposureValue:1320, ltvRatio:55, riskScore:18, createdAt:Date.now()-8640000*2 },
  { id:"pos-3", wallet:"9G4k...Fa2m", assetId:"seed-3", positionType:"borrow",     exposureValue:341250, ltvRatio:65, riskScore:31, createdAt:Date.now()-8640000*7 },
  { id:"pos-4", wallet:"HeFq...wZq5", assetId:"seed-4", positionType:"collateral", exposureValue:61750, ltvRatio:65, riskScore:25, createdAt:Date.now()-8640000*11 },
];

function uid():string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAbraStore = create<AbraState>()(
  persist(
    (set, get) => ({
      abraBalance:    2850,   // starting demo balance
      abraUsdPrice:  0.021,
      assets:        SEED_ASSETS,
      positions:     SEED_POSITIONS,
      events:        [],
      totalTVL:      0,
      totalMinted:   47,
      totalVerified: 42,

      setAbraBalance: (n) => set({ abraBalance: Math.max(0, n) }),

      deductAbra: (amount, reason, wallet) => {
        const bal = get().abraBalance;
        if (bal < amount) return false;
        set(s => ({
          abraBalance: s.abraBalance - amount,
          events: [...s.events, {
            id: uid(), eventType: "ABRA_DEDUCTED", wallet,
            payload: { amount, reason }, timestamp: Date.now(),
          }],
        }));
        return true;
      },

      mintAsset: (asset, wallet) => {
        const ok = get().deductAbra(asset.mintCostAbra, `Mint: ${asset.name}`, wallet);
        if (!ok) return null;
        const txSig = `Abr${uid().toUpperCase().slice(0,8)}...${uid().slice(-4).toUpperCase()}`;
        const newAsset: AbraAsset = {
          ...asset, id: uid(), tokenId: `AbrxM${uid().slice(0,8)}`,
          status: "pending_soft", txSignature: txSig,
          createdAt: Date.now(), ownerWallet: wallet,
        };
        set(s => ({
          assets: [...s.assets, newAsset],
          totalMinted: s.totalMinted + 1,
          events: [...s.events, {
            id: uid(), eventType: "ASSET_TOKENIZED", assetId: newAsset.id,
            wallet, txSignature: txSig,
            payload: { name: asset.name, assetClass: asset.assetClass, estimatedUsd: asset.estimatedUsd },
            timestamp: Date.now(),
          }],
        }));
        // Auto-advance: pending_soft → pending_standard (4s) → verified (12s) → listed (18s)
        setTimeout(()=>get().advanceStatus(newAsset.id,"pending_standard"), 4000);
        setTimeout(()=>get().advanceStatus(newAsset.id,"verified"), 12000);
        setTimeout(()=>get().advanceStatus(newAsset.id,"listed"), 18000);
        return newAsset;
      },

      advanceStatus: (assetId, to) => {
        set(s => ({
          assets: s.assets.map(a => {
            if (a.id !== assetId) return a;
            const updates: Partial<AbraAsset> = { status: to };
            if (to === "verified")  updates.verifiedAt = Date.now();
            if (to === "listed")    updates.listedAt   = Date.now();
            if (to === "listed")    updates.status      = "listed";
            return { ...a, ...updates };
          }),
          totalVerified: to === "verified" ? s.totalVerified + 1 : s.totalVerified,
          events: [...s.events, {
            id: uid(),
            eventType: to === "verified" ? "ASSET_VERIFIED" : to === "listed" ? "ASSET_LISTED" : "POSITION_UPDATED",
            assetId, wallet: "", payload: { status: to }, timestamp: Date.now(),
          }],
        }));
      },

      addPosition: (p) => {
        const pos: AbraPosition = { ...p, id: uid(), createdAt: Date.now() };
        set(s => ({
          positions: [...s.positions, pos],
          events: [...s.events, {
            id: uid(), eventType: "POSITION_CREATED", assetId: p.assetId,
            wallet: p.wallet, payload: { positionType: p.positionType, exposureValue: p.exposureValue },
            timestamp: Date.now(),
          }],
        }));
      },

      emitEvent: (e) => set(s => ({
        events: [...s.events, { ...e, id: uid(), timestamp: Date.now() }],
      })),

      getListedAssets:   () => get().assets.filter(a => a.status === "listed"),
      getPendingAssets:  () => get().assets.filter(a => a.status === "pending_soft" || a.status === "pending_standard"),
      getPositionsFor:   (wallet) => get().positions.filter(p => p.wallet === wallet),
      getTVL:            () => get().positions.reduce((sum,p) => sum + p.exposureValue, 0),

      resetDemo: () => set({
        assets: SEED_ASSETS, positions: SEED_POSITIONS, events: [],
        abraBalance: 2850, totalMinted: 47, totalVerified: 42,
      }),
    }),
    { name:"abraxas-store", storage: createJSONStorage(()=>localStorage) }
  )
);