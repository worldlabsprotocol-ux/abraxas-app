// FILE: lib/walletControl/holderIntentRevocationHistory.ts
// Durable holder-intent revocation lineage from append-only audit events.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const HOLDER_INTENT_WALLET_REVOCATION_REASON = "holder_unlinked" as const;

export interface HolderIntentWalletRevocation {
  bindingId: string;
  revokedAt: string;
  reason: typeof HOLDER_INTENT_WALLET_REVOCATION_REASON;
}

/**
 * Latest holder-intent revocation for a wallet binding.
 * Authoritative even when wallet_bindings.revoked_at was later cleared by repair.
 */
export async function getLatestHolderIntentWalletRevocation(
  bindingId: string,
): Promise<HolderIntentWalletRevocation | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("audit_events")
    .select("object_id, created_at, metadata")
    .eq("action", "wallet.revoked")
    .eq("object_type", "wallet_binding")
    .eq("object_id", bindingId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const reason = typeof metadata.reason === "string" ? metadata.reason : null;
    if (reason !== HOLDER_INTENT_WALLET_REVOCATION_REASON) continue;
    return {
      bindingId,
      revokedAt: row.created_at as string,
      reason: HOLDER_INTENT_WALLET_REVOCATION_REASON,
    };
  }

  return null;
}
