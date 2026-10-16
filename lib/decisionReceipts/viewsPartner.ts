// FILE: lib/decisionReceipts/viewsPartner.ts
// Partner receipt views — isolated from public view path to avoid Launchpad catalog coupling.

import type { DecisionReceiptPartnerView, DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { toPublicView } from "@/lib/decisionReceipts/views";

export function toPartnerView(
  record: DecisionReceiptRecord,
  consentScopeAllowed: boolean,
): DecisionReceiptPartnerView {
  const pack = inferPolicyPackFromPolicyId(record.policy_id);
  const withholdWalletBindingRef = pack?.id === "wallet_control";
  return {
    ...toPublicView(record),
    decision_id: record.verification_decision_id,
    consent_receipt_id: record.consent_receipt_id,
    wallet_binding_ref: consentScopeAllowed && !withholdWalletBindingRef
      ? record.wallet_binding_ref
      : null,
    consent_scope_allowed: consentScopeAllowed,
  };
}
