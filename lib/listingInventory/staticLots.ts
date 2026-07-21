// FILE: lib/listingInventory/staticLots.ts
// Static fallback lot inventory when DB is empty (CPG seed data).

import { CPG_ASSET, CPG_LOTS } from "@/lib/cpgLandCaseStudy";
import type { LotInventoryRow } from "@/lib/listingInventory/types";

const STATIC_BY_ASSET = new Map<string, LotInventoryRow[]>([
  [
    CPG_ASSET.id,
    CPG_LOTS.map(lot => ({
      assetId: CPG_ASSET.id,
      lot: lot.lot,
      acres: lot.acres,
      priceUsd: lot.priceUsd,
      status: lot.status,
      notes: lot.notes,
      source: "static_seed",
      observedAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
    })),
  ],
]);

export function getStaticLotInventory(assetId: string): LotInventoryRow[] {
  return STATIC_BY_ASSET.get(assetId) ?? [];
}

export function isMonitoredLotAsset(assetId: string): boolean {
  return STATIC_BY_ASSET.has(assetId);
}
