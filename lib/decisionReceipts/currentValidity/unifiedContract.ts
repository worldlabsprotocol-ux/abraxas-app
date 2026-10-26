// FILE: lib/decisionReceipts/currentValidity/unifiedContract.ts
// Single security contract for "is this receipt currently acceptable?" across sovereign and operational paths.

import {
  RECEIPT_CURRENT_VALIDITY_VERSION,
  type ReceiptLifecycleStatus,
} from "./contract";

export const UNIFIED_CURRENT_VALIDITY_CONTRACT_VERSION = "1.0.0" as const;

/** Inputs required to decide current acceptability — storage-agnostic. */
export type CurrentValidityDecisionInput = {
  cryptographically_valid: boolean;
  issuer_authorized: boolean;
  issued_approved: boolean;
  policy_and_audience_match: boolean;
  partner_operational: boolean;
  policy_active: boolean;
  claims_current: boolean;
  evidence_current: boolean;
  receipt_status_active: boolean;
  not_expired: boolean;
  not_superseded: boolean;
  store_available: boolean;
  /** When false, Launchpad application scope failed (inactive, unbound, or mismatched). */
  application_scope_satisfied?: boolean;
};

export type CurrentValidityDecisionResult = {
  contract_version: typeof UNIFIED_CURRENT_VALIDITY_CONTRACT_VERSION;
  currently_acceptable: boolean;
  lifecycle_status: ReceiptLifecycleStatus;
  /** Hard deny reasons — must block permit when present. */
  hard_deny_reasons: string[];
};

const HARD_DENY = new Set([
  "signature_invalid",
  "receipt_revoked",
  "receipt_expired",
  "receipt_superseded",
  "issuer_not_authorized",
  "validity_store_unavailable",
  "partner_inactive",
  "policy_no_longer_valid",
  "environment_mismatch",
  "policy_audience_mismatch",
  "partner_mismatch",
  "policy_mismatch",
  "claim_revoked",
  "claim_expired",
  "claim_missing",
  "source_evidence_missing",
  "source_evidence_revoked",
  "source_evidence_expired",
  "application_inactive",
  "application_mismatch",
  "application_unbound",
  "issuance_incomplete",
]);

export function deriveCurrentValidityDecision(
  input: CurrentValidityDecisionInput,
  extraReasons: string[] = [],
): CurrentValidityDecisionResult {
  const hard_deny_reasons = [...extraReasons].filter((r) => HARD_DENY.has(r) || r.includes("evidence"));

  const applicationOk = input.application_scope_satisfied !== false;

  const currently_acceptable =
    input.store_available
    && applicationOk
    && input.cryptographically_valid
    && input.issuer_authorized
    && input.issued_approved
    && input.policy_and_audience_match
    && input.partner_operational
    && input.policy_active
    && input.claims_current
    && input.evidence_current
    && input.receipt_status_active
    && input.not_expired
    && input.not_superseded
    && !hard_deny_reasons.some((r) => HARD_DENY.has(r));

  let lifecycle: ReceiptLifecycleStatus = "active";
  if (input.not_superseded === false || hard_deny_reasons.includes("receipt_superseded")) {
    lifecycle = "superseded";
  } else if (hard_deny_reasons.includes("receipt_revoked")) {
    lifecycle = "revoked";
  } else if (hard_deny_reasons.includes("receipt_expired") || !input.not_expired) {
    lifecycle = "expired";
  } else if (!currently_acceptable) {
    lifecycle = "invalidated";
  }

  return {
    contract_version: UNIFIED_CURRENT_VALIDITY_CONTRACT_VERSION,
    currently_acceptable,
    lifecycle_status: lifecycle,
    hard_deny_reasons: Array.from(new Set(hard_deny_reasons)),
  };
}

/** Parity helper — operational `currently_valid` vs sovereign `currently_acceptable`. */
export function securityAcceptanceEquivalent(input: {
  operational_currently_valid: boolean;
  sovereign_currently_acceptable: boolean;
}): boolean {
  return input.operational_currently_valid === input.sovereign_currently_acceptable;
}

export function assertNoUnsafePermit(input: {
  currently_acceptable: boolean;
  invalidation_reasons: string[];
  lifecycle_status: ReceiptLifecycleStatus;
}): void {
  if (!input.currently_acceptable) return;
  if (input.lifecycle_status !== "active") {
    throw new Error(`unsafe_permit: lifecycle=${input.lifecycle_status}`);
  }
  const blocking = input.invalidation_reasons.filter((r) => HARD_DENY.has(r));
  if (blocking.length > 0) {
    throw new Error(`unsafe_permit: reasons=${blocking.join(",")}`);
  }
}

export { RECEIPT_CURRENT_VALIDITY_VERSION };
