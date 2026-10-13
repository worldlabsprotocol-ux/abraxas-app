// FILE: lib/auth/passportWalletAuth/legacyLink.ts

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isHostedHolderProvider } from "@/lib/auth/hostedHolderSession";
import { PASSPORT_WALLET_ACTIONS } from "./contract";
import { consumeAndValidatePassportWalletChallenge } from "./challengeVerify";

export type LegacyWalletLinkResult =
  | { ok: true; suiAddress: string; legacyProvider: string; alreadyLinked: boolean }
  | { ok: false; code: string };

function isLegacyPassportProvider(provider: string): boolean {
  return provider === "google" || provider === "apple" || isHostedHolderProvider(provider);
}

export async function linkLegacyPassportWallet(input: {
  challengeId: string;
  walletAddress: string;
  suiNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
  sessionSuiAddress: string;
}): Promise<LegacyWalletLinkResult> {
  const sessionAddress = normalizeSuiAddress(input.sessionSuiAddress);
  let wallet: string;
  try {
    wallet = normalizeSuiAddress(input.walletAddress.trim());
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  if (sessionAddress !== wallet) {
    return { ok: false, code: "unauthorized" };
  }

  const consumed = await consumeAndValidatePassportWalletChallenge({
    ...input,
    expectedIntendedAction: PASSPORT_WALLET_ACTIONS.linkLegacyWallet,
  });
  if (!consumed.ok) {
    return consumed;
  }

  const sb = requireSupabaseAdmin();
  const { data: identity } = await sb
    .from("sui_zklogin_identities")
    .select("provider, oauth_sub, sui_address")
    .eq("sui_address", wallet)
    .maybeSingle();

  if (!identity) {
    return { ok: false, code: "unauthorized" };
  }

  const provider = String(identity.provider ?? "");
  if (!isLegacyPassportProvider(provider)) {
    return { ok: false, code: "unauthorized" };
  }

  const { data: existingGrant } = await sb
    .from("passport_wallet_login_grants")
    .select("sui_address")
    .eq("sui_address", wallet)
    .maybeSingle();

  if (existingGrant) {
    return {
      ok: true,
      suiAddress: wallet,
      legacyProvider: provider,
      alreadyLinked: true,
    };
  }

  const { error } = await sb.from("passport_wallet_login_grants").insert({
    sui_address: wallet,
    legacy_provider: provider,
    legacy_oauth_sub: String(identity.oauth_sub ?? ""),
    link_challenge_id: consumed.row.id,
  });

  if (error) {
    if (error.code === "42P01") {
      return { ok: false, code: "store_unavailable" };
    }
    if (error.code === "23505") {
      return {
        ok: true,
        suiAddress: wallet,
        legacyProvider: provider,
        alreadyLinked: true,
      };
    }
    return { ok: false, code: "persist_failed" };
  }

  return {
    ok: true,
    suiAddress: wallet,
    legacyProvider: provider,
    alreadyLinked: false,
  };
}

export async function hasPassportWalletLoginGrant(walletAddress: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const wallet = normalizeSuiAddress(walletAddress);
  const { data, error } = await sb
    .from("passport_wallet_login_grants")
    .select("sui_address")
    .eq("sui_address", wallet)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") {
      return false;
    }
    throw error;
  }
  return Boolean(data);
}
