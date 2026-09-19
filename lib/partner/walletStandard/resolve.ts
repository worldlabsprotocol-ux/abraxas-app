// FILE: lib/partner/walletStandard/resolve.ts
// Resolve an opaque binding for a partner action contract. Never returns an address.

import type { WalletStandardBindingMode, WalletStandardSafeReason } from "@/lib/partner/walletStandard/contract";
import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";
import { hashActionContractNonce } from "@/lib/partner/walletStandard/hashes";
import { consumeWalletBinding, getWalletBinding, revokeWalletBinding } from "@/lib/partner/walletStandard/store";

export async function resolveWalletBindingForAction(input: {
  mode: WalletStandardBindingMode;
  bindingRef?: string | null;
  partnerId: string;
  actionContractNonce: string;
  now?: Date;
  consume?: boolean;
}): Promise<{ ok: true; status: "not_attached" | "optional_unused" | "bound" } | { ok: false; status: WalletStandardSafeReason }> {
  if (input.mode === "not_attached") {
    return { ok: true, status: "not_attached" };
  }

  const ref = input.bindingRef?.trim() ?? "";
  if (!ref) {
    if (input.mode === "optional") return { ok: true, status: "optional_unused" };
    return { ok: false, status: "missing" };
  }

  try {
    const row = await getWalletBinding(ref, input.partnerId);
    if (!row) return { ok: false, status: "missing" };
    if (row.partner_id !== input.partnerId) return { ok: false, status: "cross_partner" };
    if (row.action_contract_nonce_hash !== hashActionContractNonce(input.partnerId, input.actionContractNonce)) {
      return { ok: false, status: "mismatched" };
    }
    const now = input.now ?? new Date();
    if (Date.parse(row.expires_at) <= now.getTime()) return { ok: false, status: "expired" };
    if (row.revoked_at) return { ok: false, status: "revoked" };
    if (row.consumed_at) return { ok: false, status: "replayed" };
    if (input.consume !== false) {
      const consumed = await consumeWalletBinding(ref, input.partnerId);
      if (consumed === "replayed") return { ok: false, status: "replayed" };
      if (consumed === "missing") return { ok: false, status: "missing" };
      if (consumed === "expired") return { ok: false, status: "expired" };
      if (consumed === "revoked") return { ok: false, status: "invalid" };
    }
    return { ok: true, status: "bound" };
  } catch (error) {
    if (error instanceof WalletStandardStoreUnavailableError) {
      return { ok: false, status: "store_unavailable" };
    }
    throw error;
  }
}

export async function revokeWalletStandardBinding(bindingRef: string, partnerId: string) {
  try {
    return await revokeWalletBinding(bindingRef, partnerId);
  } catch (error) {
    if (error instanceof WalletStandardStoreUnavailableError) {
      return "store_unavailable" as const;
    }
    throw error;
  }
}
