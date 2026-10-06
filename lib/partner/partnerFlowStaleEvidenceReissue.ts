// FILE: lib/partner/partnerFlowStaleEvidenceReissue.ts
// Supersede stale partner-flow decisions so fresh evidence can mint a new receipt.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { getReceiptByDecisionId } from "@/lib/decisionReceipts/service";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isVerificationRequestUuid } from "@/lib/partner/partnerFlowContinuationIdentifiers";
import {
  isPartnerFlowRevocationReason,
  partnerFlowVerificationRequiredFields,
} from "@/lib/partner/partnerFlowReceiptAccess";
import { resolveHolderAuthorizationState } from "@/lib/partner/partnerFlowCurrentAuthorization";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";

export function isStaleEvidenceReissueEligible(input: {
  currently_valid: boolean;
  invalidation_reasons: string[];
}): boolean {
  if (input.currently_valid) return false;
  if (input.invalidation_reasons.some(isPartnerFlowRevocationReason)) return false;
  return resolveHolderAuthorizationState(input) === "verification_required";
}

async function supersedeDecisionRow(decisionId: string): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("verification_decisions")
    .update({ status: "superseded", idempotency_key: null })
    .eq("id", decisionId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
}

async function findActiveDecisionId(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
  verificationRequestId?: string;
}): Promise<string | null> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.subjectId);
  const vrId = input.verificationRequestId?.trim();

  if (vrId && isVerificationRequestUuid(vrId)) {
    const { data, error } = await sb
      .from("verification_decisions")
      .select("id")
      .eq("request_id", vrId)
      .eq("subject_id", subject)
      .eq("status", "active")
      .order("decided_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }

  const { data, error } = await sb
    .from("verification_decisions")
    .select("id")
    .eq("partner_id", input.partnerId)
    .eq("subject_id", subject)
    .eq("policy_id", input.policyId)
    .eq("status", "active")
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.id as string | undefined) ?? null;
}

/**
 * When a prior receipt is historically authentic but no longer authorizable,
 * supersede its decision so complete can issue a fresh evaluation + receipt.
 */
export async function supersedeStalePartnerFlowDecisionIfNeeded(input: {
  suiAddress: string;
  partnerId: string;
  policyId: string;
  verificationRequestId?: string;
  launchpadApplicationId?: string | null;
}): Promise<{ superseded: boolean; replaced_receipt_id?: string | null }> {
  const decisionId = await findActiveDecisionId({
    partnerId: input.partnerId,
    subjectId: input.suiAddress,
    policyId: input.policyId,
    verificationRequestId: input.verificationRequestId,
  });
  if (!decisionId) return { superseded: false };

  const receipt = await getReceiptByDecisionId(decisionId);
  if (!receipt) return { superseded: false };

  const allowSandbox = receipt.decision_context === "sandbox_only"
    || isSandboxPolicyId(input.policyId);
  const trust = await evaluateDecisionReceiptTrust(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox,
  });

  if (!isStaleEvidenceReissueEligible(trust)) {
    return { superseded: false };
  }

  await supersedeDecisionRow(decisionId);

  return { superseded: true, replaced_receipt_id: receipt.id };
}

export { partnerFlowVerificationRequiredFields };
