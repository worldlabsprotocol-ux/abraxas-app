// FILE: lib/auth/holderClaimsSession.ts
// Resolve canonical claims subject from browser session (Solana-native or legacy Sui).

import type { NextRequest } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { resolveHolderSession } from "@/lib/auth/holderBrowserSession";
import { isSolanaNativeProductEnabled } from "@/lib/auth/solanaNative/featureFlag";

export type HolderClaimsSession = {
  claimsSubjectKey: string;
  holderAccountId: string | null;
  solanaAddress: string | null;
  legacySuiAddress: string | null;
  loginMethod: "solana_wallet" | "zklogin";
};

export async function resolveHolderClaimsSession(
  req: NextRequest,
): Promise<HolderClaimsSession | null> {
  const holder = await resolveHolderSession(req);
  if (!holder) return null;

  if (holder.loginMethod === "zklogin" && holder.suiAddress) {
    return {
      claimsSubjectKey: normalizeSuiAddress(holder.suiAddress),
      holderAccountId: null,
      solanaAddress: null,
      legacySuiAddress: normalizeSuiAddress(holder.suiAddress),
      loginMethod: "zklogin",
    };
  }

  if (holder.loginMethod === "solana_wallet") {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!holder.holderWalletId || !sbUrl || !sbKey) return null;

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { data: walletRow } = await sb
      .from("holder_wallet_accounts")
      .select("holder_account_id")
      .eq("id", holder.holderWalletId)
      .maybeSingle();

    const holderAccountId = walletRow?.holder_account_id as string | null;
    if (!holderAccountId) {
      if (!isSolanaNativeProductEnabled()) return null;
      return null;
    }

    const { data: account } = await sb
      .from("holder_accounts")
      .select("id, claims_subject_key, legacy_sui_address")
      .eq("id", holderAccountId)
      .maybeSingle();

    if (!account) return null;

    return {
      claimsSubjectKey: account.claims_subject_key as string,
      holderAccountId: account.id as string,
      solanaAddress: holder.solanaAddress,
      legacySuiAddress: (account.legacy_sui_address as string | null) ?? null,
      loginMethod: "solana_wallet",
    };
  }

  return null;
}

export async function requireHolderClaimsSession(req: NextRequest): Promise<
  | { ok: true; session: HolderClaimsSession }
  | { ok: false; error: string; status: 401; code?: string }
> {
  const session = await resolveHolderClaimsSession(req);
  if (!session) {
    return {
      ok: false,
      error: "Sign in with your wallet to continue",
      status: 401,
      code: "holder_session_required",
    };
  }
  return { ok: true, session };
}
