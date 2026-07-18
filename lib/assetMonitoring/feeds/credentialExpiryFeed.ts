// FILE: lib/assetMonitoring/feeds/credentialExpiryFeed.ts
// Automated feed: active claims past expires_at → identity/appraisal TTL signals.

import { resolveExpiredActiveClaimIds } from "@/lib/assetMonitoring/resolveClaims";
import type { AssetSignal } from "@/lib/assetMonitoring/types";

export async function runCredentialExpiryFeed(observedAt = new Date()): Promise<AssetSignal[]> {
  const expired = await resolveExpiredActiveClaimIds(100);
  const at = observedAt.toISOString();

  return expired.map(row => ({
    assetId: row.claimType,
    signalType: row.claimType.includes("identity") || row.claimType.includes("screening")
      ? "identity_ttl_expired"
      : "appraisal_expired",
    observedAt: at,
    source: "credential_expiry_feed",
    detail: `Claim ${row.claimId} expired at ${row.expiresAt}`,
    claimIds: [row.claimId],
  }));
}
