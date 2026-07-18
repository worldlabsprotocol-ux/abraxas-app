// FILE: lib/assetMonitoring/listingStatus/sources.ts
// Per-asset listing monitor config — static v1, extensible to live MLS/STR checks.

import { CPG_ASSET, CPG_LOTS } from "@/lib/cpgLandCaseStudy";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { REGISTRY_ASSETS } from "@/lib/data/registryAssets";
import type { ListingChannel, ListingSnapshot } from "@/lib/assetMonitoring/listingStatus/types";

export interface ListingMonitorChannel {
  channel: ListingChannel;
  getCurrent: () => ListingSnapshot | Promise<ListingSnapshot | null>;
}

export interface ListingMonitorConfig {
  assetId: string;
  channels: ListingMonitorChannel[];
}

export function cpgLotStatusFingerprint(): string {
  return CPG_LOTS.map(lot => `${lot.lot}:${lot.status}`).join("|");
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
        getCurrent: () => ({
          assetId: CPG_ASSET.id,
          channel: "mls_lot_status",
          status: cpgLotStatusFingerprint(),
          observedAt: new Date().toISOString(),
          detail: `${CPG_LOTS.filter(l => l.status === "available").length} lots available · ${CPG_LOTS.filter(l => l.status === "under_contract").length} under contract`,
        }),
      },
    ],
  },
];
