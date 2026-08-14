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

/** Preserve partner-flow query params when routing back to setup. */
export function buildPassportSetupHref(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  for (const key of ["verify_request", "policy_id", "partner_id", "return", "verification"] as const) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/passport?${qs}` : "/passport";
}
