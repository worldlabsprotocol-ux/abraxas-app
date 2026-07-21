// FILE: lib/assetMonitoring/listingStatus/sources.ts
// Per-asset listing monitor config — DB-backed MLS lots + pipeline stages.

import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { REGISTRY_ASSETS } from "@/lib/data/registryAssets";
import { getLotInventory, lotStatusFingerprint } from "@/lib/listingInventory/lotInventory";
import type { ListingChannel, ListingSnapshot } from "@/lib/assetMonitoring/listingStatus/types";

export interface ListingMonitorChannel {
  channel: ListingChannel;
  getCurrent: () => ListingSnapshot | Promise<ListingSnapshot | null>;
}

export interface ListingMonitorConfig {
  assetId: string;
  channels: ListingMonitorChannel[];
}

function pipelineSnapshot(assetId: string, stage: string, name: string): ListingSnapshot {
  return {
    assetId,
    channel: "pipeline_stage",
    status: stage,
    observedAt: new Date().toISOString(),
    detail: name,
  };
}

export const LISTING_MONITOR_CONFIGS: ListingMonitorConfig[] = [
  ...REGISTRY_ASSETS.map(asset => ({
    assetId: asset.abxId,
    channels: [
      {
        channel: "pipeline_stage" as const,
        getCurrent: () => pipelineSnapshot(asset.abxId, asset.pipelineStage, asset.name),
      },
    ],
  })),
  {
    assetId: FLAGSHIP_PROPERTY.id,
    channels: [
      {
        channel: "str_listing",
        getCurrent: () => ({
          assetId: FLAGSHIP_PROPERTY.id,
          channel: "str_listing",
          status: "active",
          observedAt: new Date().toISOString(),
          detail: "Airbnb listing cross-check",
          externalUrl: FLAGSHIP_PROPERTY.airbnbUrl,
        }),
      },
    ],
  },
  {
    assetId: CPG_ASSET.id,
    channels: [
      {
        channel: "mls_lot_status",
        getCurrent: async () => {
          const inventory = await getLotInventory(CPG_ASSET.id);
          return {
            assetId: CPG_ASSET.id,
            channel: "mls_lot_status",
            status: lotStatusFingerprint(inventory.lots),
            observedAt: inventory.asOf,
            detail: `${inventory.summary.available} lots available · ${inventory.summary.underContract} under contract · source: ${inventory.source}`,
          };
        },
      },
      {
        channel: "partner_push",
        getCurrent: async () => {
          const inventory = await getLotInventory(CPG_ASSET.id);
          if (inventory.source !== "database") return null;
          return {
            assetId: CPG_ASSET.id,
            channel: "partner_push",
            status: lotStatusFingerprint(inventory.lots),
            observedAt: inventory.asOf,
            detail: "Partner-pushed lot inventory active",
          };
        },
      },
    ],
  },
];

// Re-export for tests that import cpgLotStatusFingerprint
export { lotStatusFingerprint as cpgLotStatusFingerprint } from "@/lib/listingInventory/lotInventory";
