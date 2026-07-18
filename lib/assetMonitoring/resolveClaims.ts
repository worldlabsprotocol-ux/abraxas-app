// FILE: lib/assetMonitoring/resolveClaims.ts
// Resolve active credential claim IDs for a registry asset.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function resolveClaimIdsForAsset(assetId: string): Promise<string[]> {
  const sb = requireSupabaseAdmin();
  const normalized = assetId.trim().toLowerCase();

  const { data, error } = await sb
    .from("credential_claims")
    .select("id, claim_value")
    .eq("status", "active")
    .limit(500);

  if (error) {
    console.warn("resolveClaimIdsForAsset:", error.message);
    return [];
  }

  return (data ?? [])
    .filter(row => {
      const value = row.claim_value as Record<string, unknown> | null;
      if (!value) return false;
      const candidates = [value.asset_id, value.record_id, value.abx_id, value.assetId]
        .filter(Boolean)
        .map(v => String(v).toLowerCase());
      return candidates.includes(normalized);
    })
    .map(row => row.id as string);
}

export async function resolveExpiredActiveClaimIds(limit = 50): Promise<
  { claimId: string; claimType: string; expiresAt: string }[]
> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("credential_claims")
    .select("id, claim_type, expires_at")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .limit(limit);

  if (error) {
    console.warn("resolveExpiredActiveClaimIds:", error.message);
    return [];
  }

  return (data ?? []).map(row => ({
    claimId: row.id as string,
    claimType: row.claim_type as string,
    expiresAt: row.expires_at as string,
  }));
}
