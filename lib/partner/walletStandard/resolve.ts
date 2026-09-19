// FILE: lib/partner/walletStandard/resolve.ts
// Resolve an opaque binding for a partner action contract. Never returns an address.

import type { WalletStandardBindingMode, WalletStandardSafeReason } from "@/lib/partner/walletStandard/contract";
import { consumeWalletBinding, getWalletBinding } from "@/lib/partner/walletStandard/store";

export function resolveWalletBindingForAction(input: {
  mode: WalletStandardBindingMode;
  bindingRef?: string | null;
  partnerId: string;
  actionContractNonce: string;
  now?: Date;
  consume?: boolean;
}): { ok: true; status: "not_attached" | "optional_unused" | "bound" } | { ok: false; status: WalletStandardSafeReason } {
  if (input.mode === "not_attached") {
    return { ok: true, status: "not_attached" };
  }

  const ref = input.bindingRef?.trim() ?? "";
  if (!ref) {
    if (input.mode === "optional") return { ok: true, status: "optional_unused" };
    return { ok: false, status: "missing" };
  }

  const row = getWalletBinding(ref);
  if (!row) return { ok: false, status: "missing" };
  if (row.partner_id !== input.partnerId) return { ok: false, status: "cross_partner" };
  if (row.action_contract_nonce !== input.actionContractNonce) return { ok: false, status: "mismatched" };
  const now = input.now ?? new Date();
  if (Date.parse(row.expires_at) <= now.getTime()) return { ok: false, status: "expired" };

  if (row.consumed) return { ok: false, status: "replayed" };
  if (input.consume !== false) {
    const consumed = consumeWalletBinding(ref);
    if (consumed === "replayed") return { ok: false, status: "replayed" };
    if (consumed === "missing") return { ok: false, status: "missing" };
  }
  return { ok: true, status: "bound" };
}
