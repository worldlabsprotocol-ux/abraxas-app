// FILE: lib/passport/runPassportWalletBind.ts
// Shared Confirm securely repair + canonical refresh verification.

import { isBrowserSessionAuthFailure } from "@/lib/passport/passportBrowserSessionAuth";
import { repairZkLoginBinding } from "@/lib/walletAuthority/client/repairZkLoginBinding";
import type { WalletBindingRefreshState } from "@/lib/hooks/usePassportVerification";

export type PassportWalletBindResult =
  | { ok: true; refreshed?: WalletBindingRefreshState }
  | { ok: false; kind: "reauthentication_required" | "repair_failed" | "refresh_unbound" | "refresh_unavailable"; message: string };

export async function runPassportWalletBind(input: {
  browserSessionReady: boolean;
  requireReauthentication: () => void;
  onWalletBound?: () => Promise<WalletBindingRefreshState | void>;
}): Promise<PassportWalletBindResult> {
  if (!input.browserSessionReady) {
    input.requireReauthentication();
    return { ok: false, kind: "reauthentication_required", message: "" };
  }

  const result = await repairZkLoginBinding();
  if (!result.ok) {
    if (isBrowserSessionAuthFailure(result.status ?? 0, result.error)) {
      input.requireReauthentication();
      return { ok: false, kind: "reauthentication_required", message: "" };
    }
    return {
      ok: false,
      kind: "repair_failed",
      message: result.error ?? "Wallet binding repair failed.",
    };
  }

  const refreshed = await input.onWalletBound?.();
  if (refreshed && !refreshed.walletBound) {
    if (refreshed.walletBindingStatus === "unavailable") {
      return {
        ok: false,
        kind: "refresh_unavailable",
        message: "Wallet status is temporarily unavailable. Try again in a moment.",
      };
    }
    return {
      ok: false,
      kind: "refresh_unbound",
      message: "Wallet binding did not save. Try again.",
    };
  }

  return { ok: true, refreshed: refreshed ?? undefined };
}
