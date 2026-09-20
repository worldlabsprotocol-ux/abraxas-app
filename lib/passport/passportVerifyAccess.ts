// FILE: lib/passport/passportVerifyAccess.ts
// Holder verify-tab access rules for incomplete Passport setup (UI only).

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";

/** Credential JWT tools need at least sign-in + wallet bind. Registry lookup does not. */
export function passportVerifyNeedsSetup(setup: PassportSetupState): boolean {
  return !setup.accountComplete || !setup.walletBound;
}

export function passportVerifySetupBlockedReason(setup: PassportSetupState): "sign_in" | "bind_wallet" | null {
  if (!setup.accountComplete) return "sign_in";
  if (!setup.walletBound) return "bind_wallet";
  return null;
}

/** Preserve the holder verify_request pointer when routing back to setup. */
export function buildPassportSetupHref(searchParams: URLSearchParams): string {
  const verify = searchParams.get("verify_request")?.trim() ?? "";
  return verify ? `/passport?verify_request=${encodeURIComponent(verify)}` : "/passport";
}
