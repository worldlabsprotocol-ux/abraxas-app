// FILE: lib/walletControl/recoverableWalletControlRevocation.ts
// Recoverable vs fail-closed wallet-control revocation classification.

import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { WALLET_CONTROL_CLAIM_TYPE } from "@/lib/walletControl/contract";
import { HOLDER_INTENT_WALLET_REVOCATION_REASON } from "@/lib/walletControl/holderIntentRevocationHistory";
import {
  WALLET_CONTROL_PROOF_PREDATES_REVOCATION,
  WALLET_CONTROL_PROVENANCE_INSUFFICIENT,
} from "@/lib/walletControl/postRevocationProvenance";
import { partnerFlowVerificationRequiredFields } from "@/lib/partner/partnerFlowReceiptAccess";
import type { PartnerFlowEvaluateResult } from "@/lib/partner/relyingPartyFlow";

/** Holder-intent unlink — previous proof invalid; fresh explicit proof required. */
export const RECOVERABLE_WALLET_CONTROL_REVOCATION_REFERENCES = [
  HOLDER_INTENT_WALLET_REVOCATION_REASON,
  "source_evidence_revoked",
  WALLET_CONTROL_PROOF_PREDATES_REVOCATION,
  WALLET_CONTROL_PROVENANCE_INSUFFICIENT,
] as const;

/** Invalidation reasons that map to verification_required for wallet_control only. */
export const RECOVERABLE_WALLET_CONTROL_INVALIDATION_REASONS = [
  "source_evidence_revoked",
  WALLET_CONTROL_PROOF_PREDATES_REVOCATION,
  WALLET_CONTROL_PROVENANCE_INSUFFICIENT,
  "receipt_expired",
  "source_evidence_expired",
] as const;

const FAIL_CLOSED_CLAIM_STATUSES = new Set(["suspended", "under_review"]);

export function isWalletControlPolicyId(policyId: string): boolean {
  return inferPolicyPackFromPolicyId(policyId)?.id === "wallet_control";
}

export function isRecoverableWalletControlRevocationReference(
  revocationReference: string | null | undefined,
): boolean {
  if (!revocationReference) return false;
  return (RECOVERABLE_WALLET_CONTROL_REVOCATION_REFERENCES as readonly string[])
    .includes(revocationReference);
}

export function isRecoverableWalletControlInvalidationReason(reason: string): boolean {
  if ((RECOVERABLE_WALLET_CONTROL_INVALIDATION_REASONS as readonly string[]).includes(reason)) {
    return true;
  }
  if (reason === `missing:${WALLET_CONTROL_CLAIM_TYPE}`) return true;
  if (reason.startsWith("claim_expired:")) return true;
  if (reason.startsWith("missing_claim:")) return true;
  return false;
}

export function isRecoverableWalletControlPolicyDenial(reasonCodes: string[]): boolean {
  if (reasonCodes.length === 0) return false;
  return reasonCodes.every(isRecoverableWalletControlInvalidationReason);
}

/** Revoked historical wallet-control claim that must not fail-closed the partner-flow pre-gate. */
export function isRecoverableWalletControlRevokedClaim(input: {
  claim_type: string;
  status: string;
  revocation_reference?: string | null;
}): boolean {
  if (input.claim_type !== WALLET_CONTROL_CLAIM_TYPE) return false;
  if (FAIL_CLOSED_CLAIM_STATUSES.has(input.status)) return false;
  if (input.status === "revoked") {
    return isRecoverableWalletControlRevocationReference(input.revocation_reference);
  }
  return false;
}

export function walletControlVerificationRequiredOutcome(input: {
  validity?: string;
  invalidation_reasons?: string[];
  policy_version?: number;
  partner_result?: PartnerFlowEvaluateResult["partner_result"];
  replay_status?: PartnerFlowEvaluateResult["replay_status"];
  decision_id?: string;
} = {}): PartnerFlowEvaluateResult {
  const invalidationReasons = input.invalidation_reasons?.length
    ? input.invalidation_reasons
    : [`missing:${WALLET_CONTROL_CLAIM_TYPE}`];

  return {
    ...partnerFlowVerificationRequiredFields({
      currently_valid: false,
      validity: input.validity ?? "revoked_dependency",
      invalidation_reasons: invalidationReasons,
    }),
    policy_version: input.policy_version,
    partner_result: input.partner_result,
    replay_status: input.replay_status,
    decision_id: input.decision_id,
  };
}

/** Map wallet_control zero/recoverable evidence denial to verification_required. */
export function resolveWalletControlZeroEvidenceOutcome(input: {
  policyId: string;
  reasonCodes?: string[];
  invalidationReasons?: string[];
  validity?: string;
  policyVersion?: number;
}): PartnerFlowEvaluateResult | null {
  if (!isWalletControlPolicyId(input.policyId)) return null;

  const reasonCodes = input.reasonCodes ?? [];
  const invalidationReasons = input.invalidationReasons ?? [];

  const recoverableFromPolicy = reasonCodes.length > 0
    && isRecoverableWalletControlPolicyDenial(reasonCodes);
  const recoverableFromTrust = invalidationReasons.length > 0
    && invalidationReasons.every(isRecoverableWalletControlInvalidationReason);

  if (!recoverableFromPolicy && !recoverableFromTrust) return null;

  return walletControlVerificationRequiredOutcome({
    validity: input.validity ?? "revoked_dependency",
    invalidation_reasons: invalidationReasons.length
      ? invalidationReasons
      : reasonCodes,
    policy_version: input.policyVersion,
  });
}
