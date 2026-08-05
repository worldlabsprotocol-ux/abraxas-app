// FILE: lib/verify/trustDecision.ts
// Trust Decision — primary relying-party abstraction (receipt is proof underneath).

import { getSdkDefaultBaseUrl } from "@/lib/app/publicAppOrigin";
import type { PolicyDecisionRecord } from "@/lib/policy/types";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { getPermissionDefinition, permissionForPolicyId } from "@/lib/verify/permissions";
import type { TrustEvaluationResult, TrustValidityState } from "@/lib/decisionReceipts/trustEvaluation";

export interface TrustDecisionProof {
  receipt_id: string;
  schema_version: string;
  signature: string;
  signing_key_id: string;
  payload_hash: string;
  verify_url: string;
}

export interface TrustDecision {
  decision_id: string;
  approved: boolean;
  decision: "approved" | "denied" | "manual_review";
  permission: string | null;
  permission_version: string | null;
  trust_level: number | null;
  valid_until: string | null;
  reason_codes: string[];
  status: string;
  decided_at: string;
  policy_id: string;
  policy_version: number;
  relying_party_id: string;
  proof: TrustDecisionProof | null;
  /** P1-2 additive — live trust evaluation; fail closed when false. */
  currently_valid: boolean;
  validity: TrustValidityState | "unknown";
  invalidation_reasons: string[];
}

function inferTrustLevel(policyId: string): number | null {
  const mapped = permissionForPolicyId(policyId);
  if (!mapped) return null;
  return getPermissionDefinition(mapped.permission)?.trustLevel ?? null;
}

export function buildTrustDecision(input: {
  decision: PolicyDecisionRecord;
  receipt?: DecisionReceiptRecord | null;
  appUrl?: string;
  trustEvaluation?: TrustEvaluationResult | null;
}): TrustDecision {
  const appUrl = input.appUrl ?? getSdkDefaultBaseUrl();
  const mapped = permissionForPolicyId(input.decision.policy_id);

  const approved = input.decision.decision === "approved" && input.decision.status === "active";
  const trust = input.trustEvaluation;

  return {
    decision_id: input.decision.id,
    approved,
    decision: input.decision.decision,
    permission: mapped?.permission ?? null,
    permission_version: mapped?.version ?? null,
    trust_level: inferTrustLevel(input.decision.policy_id),
    valid_until: input.decision.valid_until,
    reason_codes: input.decision.reason_codes,
    status: input.decision.status,
    decided_at: input.decision.decided_at,
    policy_id: input.decision.policy_id,
    policy_version: input.decision.policy_version,
    relying_party_id: input.decision.partner_id,
    proof: input.receipt
      ? {
          receipt_id: input.receipt.id,
          schema_version: input.receipt.schema_version,
          signature: input.receipt.signature,
          signing_key_id: input.receipt.signing_key_id,
          payload_hash: input.receipt.payload_hash,
          verify_url: `${appUrl}/api/receipts/${input.receipt.id}/public`,
        }
      : null,
    currently_valid: trust?.currently_valid ?? false,
    validity: trust?.validity ?? "unknown",
    invalidation_reasons: trust?.invalidation_reasons ?? [],
  };
}
