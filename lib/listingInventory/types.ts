// FILE: lib/listingInventory/types.ts
// MLS / lot inventory types for partner push and monitoring feeds.

export type LotStatus = "available" | "under_contract" | "contingent" | "sold";

export interface LotInventoryRow {
  assetId: string;
  lot: number;
  acres: number;
  priceUsd: number;
  status: LotStatus;
  notes?: string;
  mlsListingId?: string;
  source: string;
  observedAt: string;
  updatedAt: string;
}

export interface LotStatusUpdate {
  lot: number;
  status?: LotStatus;
  acres?: number;
  price_usd?: number;
  notes?: string;
  mls_listing_id?: string;
}

export interface LotUpdateResult {
  lot: number;
  changed: boolean;
  fromStatus: LotStatus | null;
  toStatus: LotStatus;
  row: LotInventoryRow;
}

export interface LotInventoryResponse {
  assetId: string;
  lots: LotInventoryRow[];
  source: "database" | "static_fallback";
  asOf: string;
  summary: {
    available: number;
    underContract: number;
    contingent: number;
    sold: number;
  };
}
