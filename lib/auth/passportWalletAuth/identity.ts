// FILE: lib/auth/passportWalletAuth/identity.ts

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { PASSPORT_WALLET_PROVIDER } from "./contract";
import { isHostedHolderProvider } from "@/lib/auth/hostedHolderSession";
import { hasPassportWalletLoginGrant } from "./legacyLink";

export function passportWalletOAuthSub(walletAddress: string): string {
  return `passport_wallet:${normalizeSuiAddress(walletAddress)}`;
}

function generateUserSalt(): string {
  return BigInt(`0x${randomBytes(16).toString("hex")}`).toString();
}

export type ResolvePassportWalletIdentityResult =
  | { ok: true; suiAddress: string; created: boolean }
  | { ok: false; code: "legacy_link_required" | "identity_conflict" | "persist_failed" };

/**
 * Wallet login identity — never auto-merge OAuth/hosted accounts or inherit IDV claims.
 */
export async function resolvePassportWalletIdentity(
  walletAddress: string,
): Promise<ResolvePassportWalletIdentityResult> {
  const suiAddress = normalizeSuiAddress(walletAddress);
  const sb = requireSupabaseAdmin();
  const { data: existing } = await sb
    .from("sui_zklogin_identities")
    .select("provider, oauth_sub, sui_address")
    .eq("sui_address", suiAddress)
    .maybeSingle();

  if (existing) {
    const provider = String(existing.provider ?? "");
    if (provider === PASSPORT_WALLET_PROVIDER) {
      return { ok: true, suiAddress, created: false };
    }
    if (provider === "google" || provider === "apple" || isHostedHolderProvider(provider)) {
      if (await hasPassportWalletLoginGrant(suiAddress)) {
        return { ok: true, suiAddress, created: false };
      }
      return { ok: false, code: "legacy_link_required" };
    }
    if (await hasPassportWalletLoginGrant(suiAddress)) {
      return { ok: true, suiAddress, created: false };
    }
    return { ok: false, code: "legacy_link_required" };
  }

  const oauthSub = passportWalletOAuthSub(suiAddress);
  const { error } = await sb.from("sui_zklogin_identities").insert({
    oauth_sub: oauthSub,
    provider: PASSPORT_WALLET_PROVIDER,
    sui_address: suiAddress,
    user_salt: generateUserSalt(),
    email: null,
    max_epoch: null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, code: "identity_conflict" };
    }
    return { ok: false, code: "persist_failed" };
  }

  return { ok: true, suiAddress, created: true };
}

export async function assertWalletNotBoundToOtherSubject(input: {
  walletAddress: string;
  subjectId: string;
}): Promise<{ ok: true } | { ok: false; code: "wallet_bound_to_other_subject" }> {
  const sb = requireSupabaseAdmin();
  const wallet = normalizeSuiAddress(input.walletAddress);
  const subject = normalizeSuiAddress(input.subjectId);
  const { data } = await sb
    .from("wallet_bindings")
    .select("subject_id")
    .eq("chain", "sui")
    .eq("wallet_address", wallet)
    .eq("binding_status", "active")
    .is("revoked_at", null)
    .maybeSingle();

  if (data && normalizeSuiAddress(String(data.subject_id)) !== subject) {
    return { ok: false, code: "wallet_bound_to_other_subject" };
  }
  return { ok: true };
}
