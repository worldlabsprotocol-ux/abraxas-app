// FILE: lib/assetMonitoring/runFeeds.ts
// Run all automated monitoring feeds; optionally apply credential transitions.

import { applyAssetSignal } from "@/lib/assetMonitoring/apply";
import { runCredentialExpiryFeed } from "@/lib/assetMonitoring/feeds/credentialExpiryFeed";
import { runRegistryAssuranceFeed } from "@/lib/assetMonitoring/feeds/registryAssuranceFeed";
import { resolveClaimIdsForAsset } from "@/lib/assetMonitoring/resolveClaims";
import type { AssetSignal } from "@/lib/assetMonitoring/types";

export interface FeedRunResult {
  signal: AssetSignal;
  applied: boolean;
  claimResults?: Awaited<ReturnType<typeof applyAssetSignal>>["results"];
  decision?: Awaited<ReturnType<typeof applyAssetSignal>>["decision"];
  error?: string;
}

export async function runAssetMonitoringFeeds(input?: {
  apply?: boolean;
  observedAt?: Date;
  changedBy?: string;
}): Promise<{ signals: AssetSignal[]; results: FeedRunResult[] }> {
  const observedAt = input?.observedAt ?? new Date();
  const apply = input?.apply ?? false;
  const changedBy = input?.changedBy ?? "asset_monitoring_feed";

  const registrySignals = runRegistryAssuranceFeed(observedAt);
  const expirySignals = await runCredentialExpiryFeed(observedAt);
  const signals = [...expirySignals, ...registrySignals];

  const results: FeedRunResult[] = [];

  for (const signal of signals) {
    if (!apply) {
      results.push({ signal, applied: false });
      continue;
    }

    try {
      const claimIds = signal.claimIds?.length
        ? signal.claimIds
        : await resolveClaimIdsForAsset(signal.assetId);

      if (!claimIds.length) {
        results.push({ signal, applied: false, error: "No active claims resolved for asset" });
        continue;
      }

      const applied = await applyAssetSignal({
        signal: { ...signal, claimIds },
        claimIds,
        changedBy,
        idempotencyPrefix: `feed:${signal.source}:${signal.assetId}`,
      });

      results.push({
        signal,
        applied: true,
        claimResults: applied.results,
        decision: applied.decision,
      });
    } catch (err) {
      results.push({
        signal,
        applied: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { signals, results };
}
