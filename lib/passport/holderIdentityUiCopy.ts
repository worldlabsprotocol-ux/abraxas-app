// FILE: lib/passport/holderIdentityUiCopy.ts

import type { HolderIdentitySurfaceSnapshot } from "./holderIdentityReconciliation";

export function shouldDeferReusableCredentialActions(
  holderIdentity: HolderIdentitySurfaceSnapshot | null | undefined,
): boolean {
  if (!holderIdentity) return false;
  if (holderIdentity.state === "canonical_subject_ready") return false;
  return (
    holderIdentity.state === "ambiguous_identity_blocked"
    || holderIdentity.state === "reconciliation_operator_required"
    || holderIdentity.state === "identity_lookup_unavailable"
    || holderIdentity.state === "verification_present_unconfirmed"
    || holderIdentity.state === "approved_verification_confirmed"
    || holderIdentity.state === "migration_pending"
  );
}

export function isCanonicalMigrationVisibleSuccess(
  holderIdentity: HolderIdentitySurfaceSnapshot | null | undefined,
): boolean {
  return holderIdentity?.state === "canonical_subject_ready";
}

/** Avoid nudging repeat verification when status is unknown or verification already confirmed/in progress. */
export function shouldSuppressRepeatVerificationNudge(
  holderIdentity: HolderIdentitySurfaceSnapshot | null | undefined,
): boolean {
  if (!holderIdentity) return false;
  return (
    holderIdentity.state === "identity_lookup_unavailable"
    || holderIdentity.state === "approved_verification_confirmed"
    || holderIdentity.state === "verification_present_unconfirmed"
    || holderIdentity.state === "reconciliation_operator_required"
    || holderIdentity.state === "ambiguous_identity_blocked"
    || holderIdentity.state === "migration_pending"
  );
}

export function shouldShowCompleteVerificationPrompt(
  holderIdentity: HolderIdentitySurfaceSnapshot | null | undefined,
): boolean {
  return holderIdentity?.state === "no_verification_on_record";
}
