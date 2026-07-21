// FILE: lib/assetMonitoring/feeds/listingStatusFeed.ts
// Automated feed: pipeline / MLS / STR listing drift → listing_status_change signals.

import { LISTING_MONITOR_CONFIGS } from "@/lib/assetMonitoring/listingStatus/sources";
import {
  loadListingSnapshots,
  saveListingSnapshots,
} from "@/lib/assetMonitoring/listingStatus/snapshotStore";
import { listingSnapshotKey } from "@/lib/assetMonitoring/listingStatus/types";
import type { AssetSignal } from "@/lib/assetMonitoring/types";

export async function runListingStatusFeed(observedAt = new Date()): Promise<AssetSignal[]> {
  const at = observedAt.toISOString();
  const previous = await loadListingSnapshots();
  const signals: AssetSignal[] = [];
  const next = { ...previous };

  for (const config of LISTING_MONITOR_CONFIGS) {
    for (const channel of config.channels) {
      const current = await channel.getCurrent();
      if (!current) continue;

      const key = listingSnapshotKey(config.assetId, current.channel);
      const prev = previous[key];

      if (prev && prev.status === current.status) continue;

      if (!prev) {
        next[key] = { ...current, observedAt: at };
        continue;
      }

      signals.push({
        assetId: config.assetId,
        signalType: "listing_status_change",
        observedAt: at,
        source: "listing_status_feed",
        detail: `${config.assetId} ${current.channel}: ${prev.status} → ${current.status}${current.detail ? ` (${current.detail})` : ""}`,
      });
      next[key] = { ...current, observedAt: at };
    }
  }

  await saveListingSnapshots(next);
  return signals;
}
