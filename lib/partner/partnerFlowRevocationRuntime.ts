// FILE: lib/partner/partnerFlowRevocationRuntime.ts
// Pre-issuance Partner Flow revocation gate — fail closed before receipt/metering side effects.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getPartnerPolicy } from "@/lib/policy/getPolicy";
import { assertPolicyBelongsToPartner } from "@/lib/policy/assertPolicyOwnership";
import { getReceiptByDecisionId, getReceiptById } from "@/lib/decisionReceipts/service";
import {
  findActiveSessionDecision,
  findDecisionByVerificationRequest,
  findSessionReceiptForSupersede,
} from "@/lib/partner/sessionDecision";
import {
  partnerFlowReceiptAccessBlocked,
  partnerFlowRevocationDeniedFields,
} from "@/lib/partner/partnerFlowReceiptAccess";
import type { PartnerFlowEvaluateResult } from "@/lib/partner/relyingPartyFlow";

export type PartnerFlowRuntimeOperation = "evaluate" | "complete" | "refresh";

export interface PartnerFlowRevocationGateInput {
  subjectId: string;
  partnerId: string;
  policyId: string;
  operation: PartnerFlowRuntimeOperation;
  verificationRequestId?: string;
  policyVersion?: number;
}

type RevocationDenialFields = Pick<
  PartnerFlowEvaluateResult,
  "next" | "currently_valid" | "validity" | "invalidation_reasons" | "reason_codes"
>;

function claimRevocationReason(status: string): "claim_revoked" | "access_revoked" {
  return status === "revoked" ? "claim_revoked" : "access_revoked";
}

function denialFromReason(reason: string): RevocationDenialFields {
  return partnerFlowRevocationDeniedFields({
    currently_valid: false,
    validity: reason === "receipt_revoked" ? "access_revoked" : "access_revoked",
    invalidation_reasons: [reason],
  });
}

function requiredClaimTypesForPolicy(
  policy: NonNullable<Awaited<ReturnType<typeof getPartnerPolicy>>>,
): string[] {
  const required = policy.rules_json.required_claims ?? [];
  return required.map(rule => rule.claim_type);
}

export async function findRevokedPolicyClaims(input: {
  subjectId: string;
  partnerId: string;
  policyId: string;
}): Promise<{ claim_type: string; status: string } | null> {
  const policy = await getPartnerPolicy(input.policyId);
  if (!policy) return null;
  assertPolicyBelongsToPartner(policy, input.partnerId);

  const claimTypes = requiredClaimTypesForPolicy(policy);
  const subject = normalizeSuiAddress(input.subjectId);
  const sb = requireSupabaseAdmin();

  let query = sb
    .from("credential_claims")
    .select("claim_type, status")
    .eq("subject_id", subject)
    .in("status", ["revoked", "suspended", "under_review"]);

  if (claimTypes.length > 0) {
    query = query.in("claim_type", claimTypes);
  }

  const { data } = await query.order("issued_at", { ascending: false }).limit(1);
  const row = data?.[0];
  if (!row) return null;
  return { claim_type: row.claim_type as string, status: row.status as string };
}

async function resolveSessionReceipt(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
  verificationRequestId?: string;
}) {
  const subject = normalizeSuiAddress(input.subjectId);
  let session = null;

  const vrId = input.verificationRequestId?.trim();
  if (vrId) {
    session = await findDecisionByVerificationRequest({
      verificationRequestId: vrId,
      subjectId: subject,
    });
  }

  if (!session) {
    session = await findActiveSessionDecision({
      partnerId: input.partnerId,
      subjectId: subject,
      policyId: input.policyId,
    });
  }

  if (!session) return null;
  return getReceiptByDecisionId(session.decision_id);
}

export async function findRevokedPartnerSessionReceipt(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
  verificationRequestId?: string;
  includeSupersedeTarget?: boolean;
}) {
  const receipts = [];

  const sessionReceipt = await resolveSessionReceipt(input);
  if (sessionReceipt) receipts.push(sessionReceipt);

  if (input.includeSupersedeTarget) {
    const supersedeReceiptId = await findSessionReceiptForSupersede({
      partnerId: input.partnerId,
      subjectId: normalizeSuiAddress(input.subjectId),
      policyId: input.policyId,
    });
    if (supersedeReceiptId) {
      const supersedeReceipt = await getReceiptById(supersedeReceiptId);
      if (supersedeReceipt) receipts.push(supersedeReceipt);
    }
  }

  return receipts.find(receipt => receipt.status === "revoked") ?? null;
}

/**
 * Receipt-only revocation policy:
 * - Ordinary evaluate/complete replay of a revoked receipt is denied.
 * - Refresh/replay must not supersede a revoked receipt or mint a replacement automatically.
 * - A new receipt after receipt-only revoke requires a fresh Passport/complete issuance path.
 */
export async function checkPartnerFlowRevocationGate(
  input: PartnerFlowRevocationGateInput,
): Promise<RevocationDenialFields | null> {
  const revokedClaim = await findRevokedPolicyClaims({
    subjectId: input.subjectId,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  if (revokedClaim) {
    const reason = claimRevocationReason(revokedClaim.status);
    return denialFromReason(reason);
  }

  const revokedReceipt = await findRevokedPartnerSessionReceipt({
    partnerId: input.partnerId,
    subjectId: input.subjectId,
    policyId: input.policyId,
    verificationRequestId: input.verificationRequestId,
    includeSupersedeTarget: input.operation === "refresh",
  });
  if (revokedReceipt) {
    return denialFromReason("receipt_revoked");
  }

  return null;
}

export function isPartnerFlowRevocationDenied(
  result: Pick<PartnerFlowEvaluateResult, "next" | "invalidation_reasons" | "currently_valid">,
): boolean {
  if (result.next !== "denied") return false;
  return partnerFlowReceiptAccessBlocked({
    currently_valid: result.currently_valid ?? false,
    invalidation_reasons: result.invalidation_reasons ?? [],
  });
}
