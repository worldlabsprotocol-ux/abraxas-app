// FILE: lib/partner/walletStandard/store.ts
// Durable service-role store. No in-process fallback.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isWalletStoreSchemaMissing,
  WalletStandardStoreUnavailableError,
} from "@/lib/partner/walletStandard/errors";

export interface DurableWalletChallenge {
  challenge_id: string;
  partner_id: string;
  origin_hash: string;
  action_contract_nonce_hash: string;
  nonce_hash: string;
  message_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
}

export interface DurableWalletBinding {
  binding_ref: string;
  partner_id: string;
  action_contract_nonce_hash: string;
  pubkey_hash: string;
  origin_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
}

function admin() {
  try {
    return requireSupabaseAdmin();
  } catch {
    throw new WalletStandardStoreUnavailableError();
  }
}

function assertOk(error: { message?: string; code?: string } | null): void {
  if (!error) return;
  throw new WalletStandardStoreUnavailableError();
}

function mapChallenge(row: Record<string, unknown>): DurableWalletChallenge {
  return {
    challenge_id: String(row.challenge_id ?? ""),
    partner_id: String(row.partner_id ?? ""),
    origin_hash: String(row.origin_hash ?? ""),
    action_contract_nonce_hash: String(row.action_contract_nonce_hash ?? ""),
    nonce_hash: String(row.nonce_hash ?? ""),
    message_hash: String(row.message_hash ?? ""),
    expires_at: String(row.expires_at ?? ""),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
  };
}

function mapBinding(row: Record<string, unknown>): DurableWalletBinding {
  return {
    binding_ref: String(row.binding_ref ?? ""),
    partner_id: String(row.partner_id ?? ""),
    action_contract_nonce_hash: String(row.action_contract_nonce_hash ?? ""),
    pubkey_hash: String(row.pubkey_hash ?? ""),
    origin_hash: String(row.origin_hash ?? ""),
    expires_at: String(row.expires_at ?? ""),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
  };
}

export async function insertWalletChallenge(row: Omit<DurableWalletChallenge, "consumed_at" | "revoked_at">): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("wallet_standard_challenges").insert({
    challenge_id: row.challenge_id,
    partner_id: row.partner_id,
    origin_hash: row.origin_hash,
    action_contract_nonce_hash: row.action_contract_nonce_hash,
    nonce_hash: row.nonce_hash,
    message_hash: row.message_hash,
    expires_at: row.expires_at,
  });
  if (isWalletStoreSchemaMissing(error) || error) throw new WalletStandardStoreUnavailableError();
}

export function resetWalletStandardStoreForTests(): void {
  // Production store has no in-process cache. Tests reset the fake backend.
}

export async function getWalletChallengeById(challengeId: string): Promise<DurableWalletChallenge | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("wallet_standard_challenges")
    .select("challenge_id, partner_id, origin_hash, action_contract_nonce_hash, nonce_hash, message_hash, expires_at, consumed_at, revoked_at")
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (isWalletStoreSchemaMissing(error)) throw new WalletStandardStoreUnavailableError();
  assertOk(error);
  return data ? mapChallenge(data as Record<string, unknown>) : null;
}

export async function getWalletChallenge(challengeId: string, partnerId: string): Promise<DurableWalletChallenge | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("wallet_standard_challenges")
    .select("challenge_id, partner_id, origin_hash, action_contract_nonce_hash, nonce_hash, message_hash, expires_at, consumed_at, revoked_at")
    .eq("challenge_id", challengeId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (isWalletStoreSchemaMissing(error)) throw new WalletStandardStoreUnavailableError();
  assertOk(error);
  return data ? mapChallenge(data as Record<string, unknown>) : null;
}

export async function consumeWalletChallenge(
  challengeId: string,
  partnerId: string,
): Promise<{ ok: true; expires_at: string; origin_hash: string; action_contract_nonce_hash: string; message_hash: string } | { ok: false; code: string }> {
  const sb = admin();
  const { data, error } = await sb.rpc("wallet_standard_consume_challenge", {
    p_challenge_id: challengeId,
    p_partner_id: partnerId,
  });
  if (isWalletStoreSchemaMissing(error) || error) throw new WalletStandardStoreUnavailableError();
  const payload = data as { ok?: boolean; code?: string; expires_at?: string; origin_hash?: string; action_contract_nonce_hash?: string; message_hash?: string };
  if (payload?.ok) {
    return {
      ok: true,
      expires_at: String(payload.expires_at),
      origin_hash: String(payload.origin_hash),
      action_contract_nonce_hash: String(payload.action_contract_nonce_hash),
      message_hash: String(payload.message_hash),
    };
  }
  return { ok: false, code: String(payload?.code ?? "missing") };
}

export async function insertWalletBinding(row: Omit<DurableWalletBinding, "consumed_at" | "revoked_at">): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("wallet_standard_bindings").insert({
    binding_ref: row.binding_ref,
    partner_id: row.partner_id,
    action_contract_nonce_hash: row.action_contract_nonce_hash,
    pubkey_hash: row.pubkey_hash,
    origin_hash: row.origin_hash,
    expires_at: row.expires_at,
  });
  if (error?.code === "23505") return;
  if (isWalletStoreSchemaMissing(error) || error) throw new WalletStandardStoreUnavailableError();
}

export async function getWalletBinding(bindingRef: string, partnerId: string): Promise<DurableWalletBinding | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("wallet_standard_bindings")
    .select("binding_ref, partner_id, action_contract_nonce_hash, pubkey_hash, origin_hash, expires_at, consumed_at, revoked_at")
    .eq("binding_ref", bindingRef)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (isWalletStoreSchemaMissing(error)) throw new WalletStandardStoreUnavailableError();
  assertOk(error);
  return data ? mapBinding(data as Record<string, unknown>) : null;
}

export async function consumeWalletBinding(
  bindingRef: string,
  partnerId: string,
): Promise<"consumed" | "replayed" | "missing" | "expired" | "revoked"> {
  const sb = admin();
  const { data, error } = await sb.rpc("wallet_standard_consume_binding", {
    p_binding_ref: bindingRef,
    p_partner_id: partnerId,
  });
  if (isWalletStoreSchemaMissing(error) || error) throw new WalletStandardStoreUnavailableError();
  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return "consumed";
  const code = String(payload?.code ?? "missing");
  if (code === "replayed" || code === "expired" || code === "revoked") return code;
  return "missing";
}

export async function revokeWalletBinding(
  bindingRef: string,
  partnerId: string,
): Promise<"revoked" | "missing"> {
  const sb = admin();
  const { data, error } = await sb.rpc("wallet_standard_revoke_binding", {
    p_binding_ref: bindingRef,
    p_partner_id: partnerId,
  });
  if (isWalletStoreSchemaMissing(error) || error) throw new WalletStandardStoreUnavailableError();
  return (data as { ok?: boolean })?.ok ? "revoked" : "missing";
}

export {
  hashWalletPublicKey,
  bindingRefFromHash,
} from "@/lib/partner/walletStandard/hashes";
