// FILE: lib/partner/evmWalletBinding/store.ts
// Durable service-role store. No in-process fallback.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  EvmWalletStoreUnavailableError,
  isEvmWalletStoreSchemaMissing,
} from "@/lib/partner/evmWalletBinding/errors";

export interface DurableEvmWalletChallenge {
  challenge_id: string;
  partner_id: string;
  origin_hash: string;
  policy_hash: string;
  action_hash: string;
  network_hash: string;
  action_contract_nonce_hash: string;
  nonce_hash: string;
  message_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  reason_class: string;
}

export interface DurableEvmWalletBinding {
  binding_ref: string;
  partner_id: string;
  address_hash: string;
  origin_hash: string;
  policy_hash: string;
  action_hash: string;
  network_hash: string;
  action_contract_nonce_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  reason_class: string;
}

function admin() {
  try {
    return requireSupabaseAdmin();
  } catch {
    throw new EvmWalletStoreUnavailableError();
  }
}

function assertOk(error: { message?: string; code?: string } | null): void {
  if (!error) return;
  throw new EvmWalletStoreUnavailableError();
}

function mapChallenge(row: Record<string, unknown>): DurableEvmWalletChallenge {
  return {
    challenge_id: String(row.challenge_id ?? ""),
    partner_id: String(row.partner_id ?? ""),
    origin_hash: String(row.origin_hash ?? ""),
    policy_hash: String(row.policy_hash ?? ""),
    action_hash: String(row.action_hash ?? ""),
    network_hash: String(row.network_hash ?? ""),
    action_contract_nonce_hash: String(row.action_contract_nonce_hash ?? ""),
    nonce_hash: String(row.nonce_hash ?? ""),
    message_hash: String(row.message_hash ?? ""),
    expires_at: String(row.expires_at ?? ""),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    reason_class: String(row.reason_class ?? "issued"),
  };
}

function mapBinding(row: Record<string, unknown>): DurableEvmWalletBinding {
  return {
    binding_ref: String(row.binding_ref ?? ""),
    partner_id: String(row.partner_id ?? ""),
    address_hash: String(row.address_hash ?? ""),
    origin_hash: String(row.origin_hash ?? ""),
    policy_hash: String(row.policy_hash ?? ""),
    action_hash: String(row.action_hash ?? ""),
    network_hash: String(row.network_hash ?? ""),
    action_contract_nonce_hash: String(row.action_contract_nonce_hash ?? ""),
    expires_at: String(row.expires_at ?? ""),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    reason_class: String(row.reason_class ?? "bound"),
  };
}

export async function insertEvmWalletChallenge(
  row: Omit<DurableEvmWalletChallenge, "consumed_at" | "revoked_at">,
): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("evm_wallet_challenges").insert({
    challenge_id: row.challenge_id,
    partner_id: row.partner_id,
    origin_hash: row.origin_hash,
    policy_hash: row.policy_hash,
    action_hash: row.action_hash,
    network_hash: row.network_hash,
    action_contract_nonce_hash: row.action_contract_nonce_hash,
    nonce_hash: row.nonce_hash,
    message_hash: row.message_hash,
    expires_at: row.expires_at,
    reason_class: row.reason_class,
  });
  if (isEvmWalletStoreSchemaMissing(error) || error) throw new EvmWalletStoreUnavailableError();
}

export async function getEvmWalletChallengeById(challengeId: string): Promise<DurableEvmWalletChallenge | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("evm_wallet_challenges")
    .select("challenge_id, partner_id, origin_hash, policy_hash, action_hash, network_hash, action_contract_nonce_hash, nonce_hash, message_hash, expires_at, consumed_at, revoked_at, reason_class")
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (isEvmWalletStoreSchemaMissing(error)) throw new EvmWalletStoreUnavailableError();
  assertOk(error);
  return data ? mapChallenge(data as Record<string, unknown>) : null;
}

export async function getEvmWalletChallenge(challengeId: string, partnerId: string): Promise<DurableEvmWalletChallenge | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("evm_wallet_challenges")
    .select("challenge_id, partner_id, origin_hash, policy_hash, action_hash, network_hash, action_contract_nonce_hash, nonce_hash, message_hash, expires_at, consumed_at, revoked_at, reason_class")
    .eq("challenge_id", challengeId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (isEvmWalletStoreSchemaMissing(error)) throw new EvmWalletStoreUnavailableError();
  assertOk(error);
  return data ? mapChallenge(data as Record<string, unknown>) : null;
}

export async function consumeEvmWalletChallenge(
  challengeId: string,
  partnerId: string,
): Promise<
  | {
    ok: true;
    expires_at: string;
    origin_hash: string;
    policy_hash: string;
    action_hash: string;
    network_hash: string;
    action_contract_nonce_hash: string;
    message_hash: string;
  }
  | { ok: false; code: string }
> {
  const sb = admin();
  const { data, error } = await sb.rpc("evm_wallet_consume_challenge", {
    p_challenge_id: challengeId,
    p_partner_id: partnerId,
  });
  if (isEvmWalletStoreSchemaMissing(error) || error) throw new EvmWalletStoreUnavailableError();
  const payload = data as Record<string, unknown>;
  if (payload?.ok) {
    return {
      ok: true,
      expires_at: String(payload.expires_at),
      origin_hash: String(payload.origin_hash),
      policy_hash: String(payload.policy_hash),
      action_hash: String(payload.action_hash),
      network_hash: String(payload.network_hash),
      action_contract_nonce_hash: String(payload.action_contract_nonce_hash),
      message_hash: String(payload.message_hash),
    };
  }
  return { ok: false, code: String(payload?.code ?? "missing") };
}

export async function insertEvmWalletBinding(
  row: Omit<DurableEvmWalletBinding, "consumed_at" | "revoked_at">,
): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("evm_wallet_bindings").insert({
    binding_ref: row.binding_ref,
    partner_id: row.partner_id,
    address_hash: row.address_hash,
    origin_hash: row.origin_hash,
    policy_hash: row.policy_hash,
    action_hash: row.action_hash,
    network_hash: row.network_hash,
    action_contract_nonce_hash: row.action_contract_nonce_hash,
    expires_at: row.expires_at,
    reason_class: row.reason_class,
  });
  if (error?.code === "23505") return;
  if (isEvmWalletStoreSchemaMissing(error) || error) throw new EvmWalletStoreUnavailableError();
}

export async function getEvmWalletBinding(bindingRef: string, partnerId: string): Promise<DurableEvmWalletBinding | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("evm_wallet_bindings")
    .select("binding_ref, partner_id, address_hash, origin_hash, policy_hash, action_hash, network_hash, action_contract_nonce_hash, expires_at, consumed_at, revoked_at, reason_class")
    .eq("binding_ref", bindingRef)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (isEvmWalletStoreSchemaMissing(error)) throw new EvmWalletStoreUnavailableError();
  assertOk(error);
  return data ? mapBinding(data as Record<string, unknown>) : null;
}

export async function consumeEvmWalletBinding(
  bindingRef: string,
  partnerId: string,
): Promise<"consumed" | "replayed" | "missing" | "expired" | "revoked"> {
  const sb = admin();
  const { data, error } = await sb.rpc("evm_wallet_consume_binding", {
    p_binding_ref: bindingRef,
    p_partner_id: partnerId,
  });
  if (isEvmWalletStoreSchemaMissing(error) || error) throw new EvmWalletStoreUnavailableError();
  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return "consumed";
  const code = String(payload?.code ?? "missing");
  if (code === "replayed" || code === "expired" || code === "revoked") return code;
  return "missing";
}

export async function revokeEvmWalletBinding(
  bindingRef: string,
  partnerId: string,
): Promise<"revoked" | "missing"> {
  const sb = admin();
  const { data, error } = await sb.rpc("evm_wallet_revoke_binding", {
    p_binding_ref: bindingRef,
    p_partner_id: partnerId,
  });
  if (isEvmWalletStoreSchemaMissing(error) || error) throw new EvmWalletStoreUnavailableError();
  return (data as { ok?: boolean })?.ok ? "revoked" : "missing";
}
