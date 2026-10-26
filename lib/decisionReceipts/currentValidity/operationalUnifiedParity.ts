// FILE: lib/decisionReceipts/currentValidity/operationalUnifiedParity.ts
// Map operational current-validity results onto the unified fail-closed contract (#834/#835).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { ReceiptCurrentValidityResult } from "./contract";
import {
  deriveCurrentValidityDecision,
  type CurrentValidityDecisionInput,
} from "./unifiedContract";

export function mapOperationalResultToUnifiedInput(
  result: ReceiptCurrentValidityResult,
  record: DecisionReceiptRecord,
): CurrentValidityDecisionInput {
  const s = result.source_states;
  return {
    cryptographically_valid: result.cryptographically_valid,
    issuer_authorized: result.cryptographically_valid
      && !result.invalidation_reasons.some((r) =>
        r === "issuer_not_authorized" || r.includes("issuer"),
      ),
    issued_approved: result.issued_valid,
    policy_and_audience_match: !result.invalidation_reasons.some((r) =>
      r === "environment_mismatch" || r === "partner_mismatch" || r === "policy_mismatch",
    ),
    partner_operational: s.partner_operational,
    policy_active: s.policy_version_active,
    claims_current: s.claims_current,
    evidence_current: !result.invalidation_reasons.some((r) => r.includes("evidence")),
    receipt_status_active: s.receipt_status === "active",
    not_expired: s.not_expired,
    not_superseded: s.not_superseded,
    store_available: !result.invalidation_reasons.includes("validity_store_unavailable"),
    application_scope_satisfied: s.application_active !== false,
  };
}

/** Returns true when operational `currently_valid` matches unified contract on the same result. */
export function operationalMatchesUnifiedContract(
  result: ReceiptCurrentValidityResult,
  record: DecisionReceiptRecord,
): boolean {
  const unified = deriveCurrentValidityDecision(
    mapOperationalResultToUnifiedInput(result, record),
    result.invalidation_reasons,
  );
  return unified.currently_acceptable === result.currently_valid;
}
