// FILE: lib/partner/walletBindingStatus.ts
// Read-only, tenant-scoped status for Integration Studio wallet bindings.

import type { EvmWalletBindView } from "@/lib/partner/evmWalletBinding/contract";
import {
  hashEvmAction,
  hashEvmActionContractNonce,
  hashEvmNetwork,
  hashEvmOrigin,
  hashEvmPolicy,
} from "@/lib/partner/evmWalletBinding/hashes";
import type { WalletStandardBindView } from "@/lib/partner/walletStandard/contract";
import {
  hashActionContractNonce,
  hashWalletOrigin,
} from "@/lib/partner/walletStandard/hashes";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

type StoredBinding = {
  binding_ref: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
};

export function classifyStoredWalletBinding(
  row: StoredBinding | null,
  now = new Date(),
): WalletStandardBindView {
  if (!row) {
    return { ok: false, status: "not_attached", binding_ref: null, expires_at: null };
  }
  if (row.revoked_at) {
    return { ok: false, status: "revoked", binding_ref: row.binding_ref, expires_at: row.expires_at };
  }
  if (row.consumed_at) {
    return { ok: false, status: "replayed", binding_ref: row.binding_ref, expires_at: row.expires_at };
  }
  if (Date.parse(row.expires_at) <= now.getTime()) {
    return { ok: false, status: "expired", binding_ref: row.binding_ref, expires_at: row.expires_at };
  }
  return { ok: true, status: "bound", binding_ref: row.binding_ref, expires_at: row.expires_at };
}

async function latestBinding(
  table: "wallet_standard_bindings" | "evm_wallet_bindings",
  filters: Array<[string, string]>,
): Promise<StoredBinding | null> {
  let query = requireSupabaseAdmin()
    .from(table)
    .select("binding_ref, expires_at, consumed_at, revoked_at");
  for (const [column, value] of filters) query = query.eq(column, value);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("wallet_binding_status_unavailable");
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    binding_ref: String(row.binding_ref ?? ""),
    expires_at: String(row.expires_at ?? ""),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
  };
}

export async function readStudioWalletBindingStatus(input: {
  applicationId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  origin: string;
  now?: Date;
}): Promise<{ solana: WalletStandardBindView; evm: EvmWalletBindView }> {
  const solanaNonce = `studio:${input.applicationId}:wallet-binding:v1`;
  const evmNonce = `studio:${input.applicationId}:evm-wallet-binding:v1`;
  const [solanaRow, evmRow] = await Promise.all([
    latestBinding("wallet_standard_bindings", [
      ["partner_id", input.partnerId],
      ["origin_hash", hashWalletOrigin(input.origin)],
      ["action_contract_nonce_hash", hashActionContractNonce(input.partnerId, solanaNonce)],
    ]),
    latestBinding("evm_wallet_bindings", [
      ["partner_id", input.partnerId],
      ["origin_hash", hashEvmOrigin(input.origin)],
      ["policy_hash", hashEvmPolicy(input.partnerId, input.policyId, input.policyVersion)],
      ["action_hash", hashEvmAction(input.partnerId, "enable_protocol_access", "sandbox:protocol_access")],
      ["network_hash", hashEvmNetwork(input.partnerId, "evm_sandbox")],
      ["action_contract_nonce_hash", hashEvmActionContractNonce(input.partnerId, evmNonce)],
    ]),
  ]);
  return {
    solana: classifyStoredWalletBinding(solanaRow, input.now),
    evm: classifyStoredWalletBinding(evmRow, input.now) as EvmWalletBindView,
  };
}
