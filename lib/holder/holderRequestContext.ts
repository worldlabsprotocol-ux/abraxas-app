// FILE: lib/holder/holderRequestContext.ts
// Audited server-side holder context for Solana-native Passport, IDV, and partner flows.

import type { NextRequest } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireHolderClaimsSession } from "@/lib/auth/holderClaimsSession";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { isSolanaNativeProductEnabled } from "@/lib/auth/solanaNative/featureFlag";
import { normalizeSolanaAddress } from "@/lib/auth/walletLogin/solanaSignIn";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const WALLET_FRESH_HOURS = 720;

export type HolderRequestContext =
  | {
      mode: "solana_native";
      claimsSubjectKey: string;
      holderAccountId: string;
      solanaAddress: string;
      walletBindingActive: boolean;
      walletBindingFresh: boolean;
    }
  | {
      mode: "legacy_sui";
      claimsSubjectKey: string;
      legacySuiAddress: string;
      walletBindingActive: boolean;
      walletBindingFresh: boolean;
    };

async function readSolanaWalletBinding(input: {
  claimsSubjectKey: string;
  solanaAddress: string;
}): Promise<{ active: boolean; fresh: boolean }> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("wallet_bindings")
    .select("binding_method, verified_at, revoked_at, chain")
    .eq("subject_id", input.claimsSubjectKey)
    .eq("wallet_address", input.solanaAddress)
    .eq("chain", "solana")
    .is("revoked_at", null)
    .maybeSingle();

  if (!data || data.binding_method !== "signed_challenge") {
    return { active: false, fresh: false };
  }
  const verifiedAt = new Date(data.verified_at as string).getTime();
  const fresh = Date.now() - verifiedAt <= WALLET_FRESH_HOURS * 60 * 60 * 1000;
  return { active: true, fresh };
}

export async function requireHolderRequestContext(req: NextRequest): Promise<
  | { ok: true; ctx: HolderRequestContext }
  | { ok: false; error: string; status: 401; code?: string }
> {
  if (isSolanaNativeProductEnabled()) {
    const auth = await requireHolderClaimsSession(req);
    if (!auth.ok) {
      return { ok: false, error: auth.error, status: auth.status, code: auth.code };
    }
    if (
      auth.session.loginMethod !== "solana_wallet"
      || !auth.session.holderAccountId
      || !auth.session.solanaAddress
    ) {
      return {
        ok: false,
        error: "Sign in with Phantom to continue",
        status: 401,
        code: "solana_wallet_required",
      };
    }

    let solanaAddress: string;
    try {
      solanaAddress = normalizeSolanaAddress(auth.session.solanaAddress);
    } catch {
      return { ok: false, error: "Invalid wallet session", status: 401 };
    }

    const claimsSubjectKey = normalizeSuiAddress(auth.session.claimsSubjectKey);
    const binding = await readSolanaWalletBinding({ claimsSubjectKey, solanaAddress });

    const sb = requireSupabaseAdmin();
    const { data: account } = await sb
      .from("holder_accounts")
      .select("id")
      .eq("id", auth.session.holderAccountId)
      .maybeSingle();
    if (!account) {
      return { ok: false, error: "Holder account unavailable", status: 401 };
    }

    return {
      ok: true,
      ctx: {
        mode: "solana_native",
        claimsSubjectKey,
        holderAccountId: auth.session.holderAccountId,
        solanaAddress,
        walletBindingActive: binding.active,
        walletBindingFresh: binding.fresh,
      },
    };
  }

  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status };
  }
  const claimsSubjectKey = normalizeSuiAddress(auth.session.suiAddress);
  return {
    ok: true,
    ctx: {
      mode: "legacy_sui",
      claimsSubjectKey,
      legacySuiAddress: claimsSubjectKey,
      walletBindingActive: true,
      walletBindingFresh: true,
    },
  };
}

/** Claims-subject key for IDV rows and credential lookups (never trust client body). */
export function holderClaimsSubjectKey(ctx: HolderRequestContext): string {
  return ctx.claimsSubjectKey;
}
