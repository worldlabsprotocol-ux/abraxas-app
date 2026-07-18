// FILE: lib/assetMonitoring/listingStatus/types.ts
// Listing / MLS / pipeline snapshot types for asset monitoring feeds.

export type ListingChannel =
  | "pipeline_stage"
  | "str_listing"
  | "mls_lot_status"
  | "partner_push";

export interface ListingSnapshot {
  assetId: string;
  channel: ListingChannel;
  status: string;
  observedAt: string;
  detail?: string;
  externalUrl?: string;
}

export type ListingSnapshotMap = Record<string, ListingSnapshot>;

export function listingSnapshotKey(assetId: string, channel: ListingChannel): string {
  return `${assetId}:${channel}`;
}
