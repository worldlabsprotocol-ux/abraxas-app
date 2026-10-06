// FILE: lib/decisionReceipts/currentValidity/contract.ts
// Canonical issuance vs current validity contract for decision receipts.

export const RECEIPT_CURRENT_VALIDITY_VERSION = "1.0.0" as const;

export const RECEIPT_LIFECYCLE_STATUSES = [
  "active",
  "expired",
  "revoked",
  "superseded",
  "invalidated",
] as const;
export type ReceiptLifecycleStatus = (typeof RECEIPT_LIFECYCLE_STATUSES)[number];

/** Partner-safe invalidation reasons — no PII or internal operator notes. */
export const PARTNER_SAFE_RECEIPT_INVALIDATION_REASONS = [
  "receipt_revoked",
  "receipt_expired",
  "receipt_superseded",
  "receipt_invalid",
  "signature_invalid",
  "evidence_refresh_required",
  "policy_no_longer_valid",
  "application_inactive",
  "partner_inactive",
  "environment_mismatch",
  "verification_incomplete",
] as const;
export type PartnerSafeReceiptInvalidationReason = (typeof PARTNER_SAFE_RECEIPT_INVALIDATION_REASONS)[number];

export const RECEIPT_SUPERSESSION_SCOPES = ["session_refresh", "explicit_reissue"] as const;
export type ReceiptSupersessionScope = (typeof RECEIPT_SUPERSESSION_SCOPES)[number];

export interface ReceiptCurrentValiditySourceStates {
  signature_valid: boolean;
  receipt_status: string;
  claims_current: boolean;
  policy_version_active: boolean;
  partner_operational: boolean;
  application_active: boolean | null;
  not_superseded: boolean;
  not_expired: boolean;
  environment_compatible: boolean;
}

export interface ReceiptCurrentValidityResult {
  contract_version: typeof RECEIPT_CURRENT_VALIDITY_VERSION;
  currently_valid: boolean;
  /** What Abraxas proved at issuance time (approved decision + valid signature). */
  issued_valid: boolean;
  cryptographically_valid: boolean;
  lifecycle_status: ReceiptLifecycleStatus;
  partner_safe_reason: PartnerSafeReceiptInvalidationReason | null;
  checked_at: string;
  source_states: ReceiptCurrentValiditySourceStates;
  /** Internal/operator reason codes — never expose raw notes or evidence. */
  invalidation_reasons: string[];
}
