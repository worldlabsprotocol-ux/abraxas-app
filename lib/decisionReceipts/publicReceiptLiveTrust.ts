// FILE: lib/decisionReceipts/publicReceiptLiveTrust.ts
// Live trust enrichment for public receipt responses — sync, deterministic, no PII.

import type { DecisionReceiptPublicView, DecisionReceiptRecord, EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import { SHARED_SURFACE_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";
import {
  evaluatePublicReceiptTrust,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";
import { evaluateReceiptCurrentValidity } from "@/lib/decisionReceipts/currentValidity";
import type { ReceiptLifecycleStatus, PartnerSafeReceiptInvalidationReason } from "@/lib/decisionReceipts/currentValidity";

export type PublicReceiptLiveTrustView = DecisionReceiptPublicView & {
  currently_valid: boolean;
  validity: string;
  invalidation_reasons: string[];
  issued_valid: boolean;
  lifecycle_status: ReceiptLifecycleStatus;
  partner_safe_reason: PartnerSafeReceiptInvalidationReason | null;
  validity_checked_at: string;
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
  currentValidity?: {
    issued_valid: boolean;
    lifecycle_status: ReceiptLifecycleStatus;
    partner_safe_reason: PartnerSafeReceiptInvalidationReason | null;
    validity_checked_at: string;
  },
): PublicReceiptLiveTrustView {
  const attached = {
    ...view,
    currently_valid: trust.currently_valid,
    validity: trust.validity,
    invalidation_reasons: trust.invalidation_reasons,
    issued_valid: currentValidity?.issued_valid ?? (trust.signature_valid && view.decision_result === "approved"),
    lifecycle_status: currentValidity?.lifecycle_status ?? (trust.currently_valid ? "active" : "invalidated"),
    partner_safe_reason: currentValidity?.partner_safe_reason ?? null,
    validity_checked_at: currentValidity?.validity_checked_at ?? new Date().toISOString(),
  };
  return (pickAllowedKeys(attached, SHARED_SURFACE_FIELDS.public_receipt) ?? attached) as unknown as PublicReceiptLiveTrustView;
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
  const currentValidity = await evaluateReceiptCurrentValidity({
    record,
    expectedPartnerId: record.partner_id,
    expectedPolicyId: record.policy_id,
  });
  const trust = evaluatePublicReceiptTrust(enrichedView, {
    partnerId: record.partner_id,
    policyId: record.policy_id,
    now: new Date(currentValidity.checked_at),
  });
  trust.currently_valid = currentValidity.currently_valid;
  trust.invalidation_reasons = currentValidity.invalidation_reasons;
  if (currentValidity.lifecycle_status === "superseded") {
    trust.validity = "access_revoked";
  } else if (currentValidity.lifecycle_status === "revoked" || currentValidity.lifecycle_status === "invalidated") {
    trust.validity = "invalidated";
  } else if (currentValidity.lifecycle_status === "expired") {
    trust.validity = "expired";
  } else {
    trust.validity = "active";
  }
  return attachLiveTrustToPublicView(enrichedView, trust, {
    issued_valid: currentValidity.issued_valid,
    lifecycle_status: currentValidity.lifecycle_status,
    partner_safe_reason: currentValidity.partner_safe_reason,
    validity_checked_at: currentValidity.checked_at,
  });
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
