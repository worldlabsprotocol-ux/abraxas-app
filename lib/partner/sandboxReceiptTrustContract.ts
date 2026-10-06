// FILE: lib/partner/sandboxReceiptTrustContract.ts
// Shared sandbox-only receipt trust vocabulary for producers and verifiers.

export const CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON =
  "sandbox_only_not_production_usable" as const;

export const LEGACY_SANDBOX_ONLY_INVALIDATION_REASON =
  "production_not_usable:false" as const;

export const SANDBOX_ONLY_INVALIDATION_REASONS = [
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
  LEGACY_SANDBOX_ONLY_INVALIDATION_REASON,
] as const;

export function isSandboxOnlyInvalidationReason(reason: string): boolean {
  return (SANDBOX_ONLY_INVALIDATION_REASONS as readonly string[]).includes(reason);
}

export function isSandboxOnlyInvalidationReasonSet(reasons: string[] | null | undefined): boolean {
  if (!reasons?.length) return false;
  return reasons.some(isSandboxOnlyInvalidationReason);
}
