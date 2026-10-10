// FILE: lib/auth/walletLogin/service.ts
// Persist and consume Solana wallet login challenges; upsert holder wallet accounts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeHolderContinuePath } from "@/lib/auth/holderContinuePath";
import { resolveConnectDomain } from "@/lib/walletAuthority/service";
import {
  buildSolanaSignInMessage,
  createLoginChallengeId,
  createLoginNonce,
  normalizeSolanaAddress,
  SOLANA_LOGIN_CHALLENGE_TTL_MS,
} from "@/lib/auth/walletLogin/solanaSignIn";

export type HolderWalletAccount = {
  id: string;
  solana_address: string;
  linked_sui_address: string | null;
};

function resolveLoginEnvironment(): string {
  return process.env.ABRAXAS_RUNTIME_ENV?.trim()
    || process.env.VERCEL_ENV?.trim()
    || process.env.NODE_ENV
    || "unknown";
}

function resolveSolanaChainId(): string {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim().toLowerCase();
  if (cluster === "devnet" || cluster === "testnet") return cluster;
  return "mainnet";
}

export async function mintHolderWalletLoginChallenge(input: {
  solanaAddress: string;
  continuePath?: string | null;
}): Promise<
  | { ok: true; challengeId: string; message: string; expiresAt: string }
  | { ok: false; error: string }
> {
  let address: string;
  try {
    address = normalizeSolanaAddress(input.solanaAddress);
  } catch {
    return { ok: false, error: "Invalid Solana address" };
  }

  const sb = requireSupabaseAdmin();
  const domain = resolveConnectDomain();
  const nonce = createLoginNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SOLANA_LOGIN_CHALLENGE_TTL_MS);
  const continuePath = normalizeHolderContinuePath(input.continuePath ?? null);

  const message = buildSolanaSignInMessage({
    domain,
    address,
    chainId: resolveSolanaChainId(),
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiresAt.toISOString(),
  });

  const challengeId = createLoginChallengeId();
  const { error } = await sb.from("holder_wallet_login_challenges").insert({
    id: challengeId,
    solana_address: address,
    message,
    domain,
    environment: resolveLoginEnvironment(),
    nonce,
    continue_path: continuePath,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { ok: false, error: "Challenge store unavailable" };
  }

  return {
    ok: true,
    challengeId,
    message,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function consumeHolderWalletLoginChallenge(
  sb: SupabaseClient,
  challengeId: string,
): Promise<Record<string, unknown> | null> {
  const now = new Date().toISOString();
  const { data } = await sb
    .from("holder_wallet_login_challenges")
    .update({ consumed_at: now })
    .eq("id", challengeId)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("*")
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function upsertHolderWalletAccount(solanaAddress: string): Promise<HolderWalletAccount> {
  const sb = requireSupabaseAdmin();
  const address = normalizeSolanaAddress(solanaAddress);

  const { data: existing } = await sb
    .from("holder_wallet_accounts")
    .select("*")
    .eq("solana_address", address)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id as string,
      solana_address: existing.solana_address as string,
      linked_sui_address: (existing.linked_sui_address as string | null) ?? null,
    };
  }

  const { data: inserted, error } = await sb
    .from("holder_wallet_accounts")
    .insert({ solana_address: address })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error("holder_wallet_account_persist_failed");
  }

  return {
    id: inserted.id as string,
    solana_address: inserted.solana_address as string,
    linked_sui_address: null,
  };
}
