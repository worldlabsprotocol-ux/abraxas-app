// FILE: lib/decisionReceipts/publicReceiptLiveTrust.ts
// Live trust enrichment for public receipt responses — sync, deterministic, no PII.

import type { DecisionReceiptPublicView, DecisionReceiptRecord, EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { toPublicView } from "@/lib/decisionReceipts/views";
import {
  evaluatePublicReceiptTrust,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";

export type PublicReceiptLiveTrustView = DecisionReceiptPublicView & {
  currently_valid: boolean;
  validity: string;
  invalidation_reasons: string[];
};

export async function resolveLiveClaimStatuses(
  claimIds: string[],
): Promise<Map<string, string>> {
  const statuses = new Map<string, string>();
  if (!claimIds.length) return statuses;

  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("credential_claims")
    .select("id, status, expires_at")
    .in("id", claimIds);

  const now = Date.now();
  for (const row of data ?? []) {
    const id = row.id as string;
    let status = String(row.status ?? "active");
    const expiresAt = row.expires_at as string | null;
    if (status === "active" && expiresAt && new Date(expiresAt).getTime() <= now) {
      status = "expired";
    }
    statuses.set(id, status);
  }
  return statuses;
}

export function applyLiveClaimStatusesToRefs(
  refs: EvaluatedClaimRef[],
  liveStatuses: Map<string, string>,
): EvaluatedClaimRef[] {
  return refs.map(ref => ({
    ...ref,
    status: liveStatuses.get(ref.claim_id) ?? ref.status,
  }));
}

export function attachLiveTrustToPublicView(
  view: DecisionReceiptPublicView,
  trust: TrustEvaluationResult,
): PublicReceiptLiveTrustView {
  return {
    ...view,
    currently_valid: trust.currently_valid,
    validity: trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
  };
}

export async function buildPublicReceiptWithLiveTrust(
  record: DecisionReceiptRecord,
): Promise<PublicReceiptLiveTrustView> {
  const claimIds = record.evaluated_claim_refs.map(ref => ref.claim_id);
  const liveStatuses = await resolveLiveClaimStatuses(claimIds);
  const baseView = toPublicView(record);
  const enrichedView: DecisionReceiptPublicView = {
    ...baseView,
    evaluated_claim_refs: applyLiveClaimStatusesToRefs(baseView.evaluated_claim_refs, liveStatuses),
  };
  const trust = evaluatePublicReceiptTrust(enrichedView, {
    partnerId: record.partner_id,
    policyId: record.policy_id,
  });
  return attachLiveTrustToPublicView(enrichedView, trust);
}

export function publicReceiptLiveTrustHasNoPii(view: PublicReceiptLiveTrustView): boolean {
  const text = JSON.stringify(view).toLowerCase();
  return !text.includes("@")
    && !text.includes("reviewer")
    && !text.includes("note")
    && !text.includes("0x")
    && !text.includes("sui_address")
    && !text.includes("subject_id");
}
