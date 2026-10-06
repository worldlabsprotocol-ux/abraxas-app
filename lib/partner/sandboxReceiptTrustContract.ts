// FILE: lib/partner/sandboxReceiptTrustContract.ts
// Shared sandbox receipt trust semantics for producers and Partner Kit verification.

/** Canonical public invalidation reason for sandbox-only receipts. */
export const CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON = "sandbox_only_not_production_usable";

/**
 * Legacy alias emitted by older trust evaluation paths and partner fixtures.
 * Kept for backward-compatible verification only.
 */
export const LEGACY_SANDBOX_ONLY_INVALIDATION_REASON = "production_not_usable:false";

export const ACCEPTED_SANDBOX_ONLY_INVALIDATION_REASONS = [
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
  LEGACY_SANDBOX_ONLY_INVALIDATION_REASON,
] as const;

export type AcceptedSandboxOnlyInvalidationReason =
  (typeof ACCEPTED_SANDBOX_ONLY_INVALIDATION_REASONS)[number];

export function isAcceptedSandboxOnlyInvalidationReason(
  reason: string,
): reason is AcceptedSandboxOnlyInvalidationReason {
  return (ACCEPTED_SANDBOX_ONLY_INVALIDATION_REASONS as readonly string[]).includes(reason);
}

/** Sandbox receipts must carry exactly one canonical or legacy sandbox-only reason. */
export function isSandboxOnlyInvalidationReasonSet(reasons: string[] | null | undefined): boolean {
  if (!reasons || reasons.length !== 1) return false;
  return isAcceptedSandboxOnlyInvalidationReason(reasons[0]!);
}

/** True when the receipt's invalidation reasons are purely the sandbox-only limitation. */
export function isPureSandboxOnlyLimitation(receipt: {
  production_usable?: boolean;
  decision_context?: string;
  invalidation_reasons?: string[] | null;
}): boolean {
  return receipt.production_usable === false
    && receipt.decision_context === "sandbox_only"
    && isSandboxOnlyInvalidationReasonSet(receipt.invalidation_reasons);
}
