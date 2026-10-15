// FILE: lib/passport/holderIdentityUiCopy.ts

import type { HolderIdentitySurfaceSnapshot } from "./holderIdentityReconciliation";

export function shouldDeferReusableCredentialActions(
  holderIdentity: HolderIdentitySurfaceSnapshot | null | undefined,
): boolean {
  if (!holderIdentity) return false;
  return (
    holderIdentity.state === "ambiguous_identity_blocked"
    || holderIdentity.state === "reconciliation_operator_required"
    || holderIdentity.state === "identity_lookup_unavailable"
  );
}

/** Avoid nudging repeat verification when IDV lookup failed closed. */
export function shouldSuppressRepeatVerificationNudge(
  holderIdentity: HolderIdentitySurfaceSnapshot | null | undefined,
): boolean {
  return holderIdentity?.state === "identity_lookup_unavailable";
}
