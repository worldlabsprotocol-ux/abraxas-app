// FILE: lib/assetMonitoring/feeds/registryAssuranceFeed.ts
// Automated feed: registry L4 monitoring gaps → review signals.

import { REGISTRY_ASSETS } from "@/lib/data/registryAssets";
import type { AssetSignal } from "@/lib/assetMonitoring/types";

export function runRegistryAssuranceFeed(observedAt = new Date()): AssetSignal[] {
  const at = observedAt.toISOString();
  const signals: AssetSignal[] = [];

  for (const asset of REGISTRY_ASSETS) {
    const l4 = asset.assuranceTaxonomy.L4_ActiveMonitoring;
    if (!l4) continue;

    if (l4.status === "PENDING") {
      signals.push({
        assetId: asset.abxId,
        signalType: "listing_status_change",
        observedAt: at,
        source: "registry_assurance_feed",
        detail: `${asset.name}: L4 active monitoring not yet live — counterparties should treat attestations as point-in-time.`,
      });
      continue;
    }

    if (l4.status === "ACTIVE" && l4.lastSync) {
      const last = new Date(l4.lastSync).getTime();
      const staleMs = 30 * 24 * 60 * 60 * 1000;
      if (observedAt.getTime() - last > staleMs) {
        signals.push({
          assetId: asset.abxId,
          signalType: "listing_status_change",
          observedAt: at,
          source: "registry_assurance_feed",
          detail: `${asset.name}: L4 monitoring stale since ${l4.lastSync}`,
        });
      }
    }
  }

  return signals;
}
