// FILE: lib/partner/tradingVenue/nonceStore.ts
// Durable one-time nonce consume. Tenant keyed hashed nonce. No receipt material.

import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";
import { hashWalletNonce } from "@/lib/partner/walletStandard/hashes";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isWalletStoreSchemaMissing } from "@/lib/partner/walletStandard/errors";

export function resetTradingVenueNonceStoreForTests(): void {
  // Durable store has no in-process cache. Tests reset the fake backend.
}

export async function consumeTradingVenueNonce(
  partnerId: string,
  nonce: string,
  expiresAt: string,
): Promise<"consumed" | "replayed" | "invalid" | "expired"> {
  const partner = partnerId.trim();
  const value = nonce.trim();
  if (!partner || !value || value.length < 16 || value.length > 128) {
    return "invalid";
  }
  let sb;
  try {
    sb = requireSupabaseAdmin();
  } catch {
    throw new WalletStandardStoreUnavailableError();
  }
  const { data, error } = await sb.rpc("venue_consume_action_nonce", {
    p_partner_id: partner,
    p_nonce_hash: hashWalletNonce(partner, value),
    p_expires_at: expiresAt,
  });
  if (isWalletStoreSchemaMissing(error) || error) throw new WalletStandardStoreUnavailableError();
  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return "consumed";
  const code = String(payload?.code ?? "invalid");
  if (code === "replayed" || code === "expired") return code;
  return "invalid";
}
