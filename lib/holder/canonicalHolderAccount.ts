// FILE: lib/holder/canonicalHolderAccount.ts
// Canonical holder account + Solana wallet binding at login.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  claimsSubjectKeyForAbraxasSubject,
  generateAbraxasSubjectId,
} from "@/lib/identity/subject/claimsSubjectKey";
import { normalizeSolanaAddress } from "@/lib/auth/walletLogin/solanaSignIn";
import { resolveConnectDomain } from "@/lib/walletAuthority/service";

export type CanonicalHolderAccount = {
  holderAccountId: string;
  claimsSubjectKey: string;
  solanaAddress: string;
  legacySuiAddress: string | null;
};

export async function ensureCanonicalHolderForSolanaWallet(
  solanaAddressInput: string,
  holderWalletRowId: string,
): Promise<CanonicalHolderAccount> {
  const sb = requireSupabaseAdmin();
  const solanaAddress = normalizeSolanaAddress(solanaAddressInput);

  const { data: walletRow } = await sb
    .from("holder_wallet_accounts")
    .select("id, holder_account_id, linked_sui_address")
    .eq("id", holderWalletRowId)
    .maybeSingle();

  if (!walletRow) {
    throw new Error("holder_wallet_missing");
  }

  let holderAccountId = walletRow.holder_account_id as string | null;

  if (holderAccountId) {
    const { data: account } = await sb
      .from("holder_accounts")
      .select("id, claims_subject_key, legacy_sui_address")
      .eq("id", holderAccountId)
      .maybeSingle();
    if (!account) throw new Error("holder_account_missing");
    await upsertSolanaWalletBinding({
      claimsSubjectKey: account.claims_subject_key as string,
      solanaAddress,
      loginChallengeId: `login-${holderWalletRowId}`,
    });
    return {
      holderAccountId: account.id as string,
      claimsSubjectKey: account.claims_subject_key as string,
      solanaAddress,
      legacySuiAddress: (account.legacy_sui_address as string | null) ?? null,
    };
  }

  holderAccountId = generateAbraxasSubjectId();
  const claimsSubjectKey = claimsSubjectKeyForAbraxasSubject(holderAccountId);
  const legacySui = (walletRow.linked_sui_address as string | null) ?? null;

  const { error: accountErr } = await sb.from("holder_accounts").insert({
    id: holderAccountId,
    claims_subject_key: claimsSubjectKey,
    legacy_sui_address: legacySui,
  });
  if (accountErr) throw new Error("holder_account_persist_failed");

  const { error: linkErr } = await sb
    .from("holder_wallet_accounts")
    .update({ holder_account_id: holderAccountId })
    .eq("id", holderWalletRowId);
  if (linkErr) throw new Error("holder_wallet_link_failed");

  await upsertSolanaWalletBinding({
    claimsSubjectKey,
    solanaAddress,
    loginChallengeId: `login-${holderWalletRowId}`,
  });

  await sb.from("user_profiles").upsert({
    wallet_address: claimsSubjectKey,
    display_name: null,
    username: null,
  }, { onConflict: "wallet_address" });

  return {
    holderAccountId,
    claimsSubjectKey,
    solanaAddress,
    legacySuiAddress: legacySui,
  };
}

async function upsertSolanaWalletBinding(input: {
  claimsSubjectKey: string;
  solanaAddress: string;
  loginChallengeId: string;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const domain = resolveConnectDomain();

  await sb.from("wallet_bindings").upsert({
    subject_id: input.claimsSubjectKey,
    chain: "solana",
    chain_id: null,
    wallet_address: input.solanaAddress,
    binding_method: "signed_challenge",
    binding_status: "active",
    verified_domain: domain,
    proof_signature: input.loginChallengeId.slice(0, 64),
    verified_at: now,
    revoked_at: null,
    risk_status: "low",
  }, { onConflict: "subject_id,wallet_address" });
}
