// FILE: lib/partner/evmWalletBinding/resolve.ts
// Resolve an opaque EVM binding for one action contract. Never returns an address.

import type { EvmWalletBindingMode, EvmWalletSafeReason } from "@/lib/partner/evmWalletBinding/contract";
import { EvmWalletStoreUnavailableError } from "@/lib/partner/evmWalletBinding/errors";
import {
  hashEvmAction,
  hashEvmActionContractNonce,
  hashEvmNetwork,
  hashEvmPolicy,
} from "@/lib/partner/evmWalletBinding/hashes";
import {
  consumeEvmWalletBinding,
  getEvmWalletBinding,
  revokeEvmWalletBinding,
} from "@/lib/partner/evmWalletBinding/store";

export async function resolveEvmWalletBindingForAction(input: {
  mode: EvmWalletBindingMode;
  bindingRef?: string | null;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionScope: string;
  networkId: string;
  actionContractNonce: string;
  now?: Date;
  consume?: boolean;
}): Promise<{ ok: true; status: "not_attached" | "optional_unused" | "bound" } | { ok: false; status: EvmWalletSafeReason }> {
  if (input.mode === "not_attached") {
    return { ok: true, status: "not_attached" };
  }

  const ref = input.bindingRef?.trim() ?? "";
  if (!ref) {
    if (input.mode === "optional") return { ok: true, status: "optional_unused" };
    return { ok: false, status: "missing" };
  }

  try {
    const row = await getEvmWalletBinding(ref, input.partnerId);
    if (!row) return { ok: false, status: "missing" };
    if (row.partner_id !== input.partnerId) return { ok: false, status: "cross_partner" };
    if (row.action_contract_nonce_hash !== hashEvmActionContractNonce(input.partnerId, input.actionContractNonce)) {
      return { ok: false, status: "mismatched" };
    }
    if (row.policy_hash !== hashEvmPolicy(input.partnerId, input.policyId, input.policyVersion)) {
      return { ok: false, status: "mismatched" };
    }
    if (row.action_hash !== hashEvmAction(input.partnerId, input.actionType, input.actionScope)) {
      return { ok: false, status: "mismatched" };
    }
    if (row.network_hash !== hashEvmNetwork(input.partnerId, input.networkId)) {
      return { ok: false, status: "mismatched" };
    }
    const now = input.now ?? new Date();
    if (Date.parse(row.expires_at) <= now.getTime()) return { ok: false, status: "expired" };
    if (row.revoked_at) return { ok: false, status: "revoked" };
    if (row.consumed_at) return { ok: false, status: "replayed" };
    if (input.consume !== false) {
      const consumed = await consumeEvmWalletBinding(ref, input.partnerId);
      if (consumed === "replayed") return { ok: false, status: "replayed" };
      if (consumed === "missing") return { ok: false, status: "missing" };
      if (consumed === "expired") return { ok: false, status: "expired" };
      if (consumed === "revoked") return { ok: false, status: "invalid" };
    }
    return { ok: true, status: "bound" };
  } catch (error) {
    if (error instanceof EvmWalletStoreUnavailableError) {
      return { ok: false, status: "store_unavailable" };
    }
    throw error;
  }
}

export async function revokeEvmWalletControlBinding(bindingRef: string, partnerId: string) {
  try {
    return await revokeEvmWalletBinding(bindingRef, partnerId);
  } catch (error) {
    if (error instanceof EvmWalletStoreUnavailableError) {
      return "store_unavailable" as const;
    }
    throw error;
  }
}
