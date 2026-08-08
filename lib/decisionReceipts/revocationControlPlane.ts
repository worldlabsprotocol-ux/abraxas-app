// FILE: lib/decisionReceipts/revocationControlPlane.ts
// Admin-only credential and partner receipt revocation — idempotent, audited, non-PII.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { getActiveClaims } from "@/lib/credentials/claimsService";

export const REVOCATION_REASON_CODES = [
  "operator_security_review",
  "credential_compromised",
  "policy_violation",
  "fraud_investigation",
  "compliance_hold",
  "duplicate_issuance",
] as const;

export type RevocationReasonCode = (typeof REVOCATION_REASON_CODES)[number];

export interface RevokeDecisionReceiptResult {
  ok: true;
  receiptId: string;
  decisionId: string;
  status: "revoked";
  revokedAt: string;
  reasonCode: RevocationReasonCode;
  alreadyRevoked: boolean;
  claimIds: string[];
}

export interface SubjectPartnerAccessItem {
  claim_id: string;
  claim_type: string;
  status: string;
  status_reason_code: string | null;
}

export interface SubjectPartnerReceiptItem {
  receipt_id: string;
  decision_id: string;
  partner_id: string;
  policy_id: string;
  status: string;
  revoked_at: string | null;
  revocation_reason_code: string | null;
}

interface RpcReceiptRevokeResult {
  ok: boolean;
  error?: string;
  receipt_id?: string;
  decision_id?: string;
  revoked_at?: string;
  reason_code?: string;
  already_revoked?: boolean;
  claim_ids?: string[];
}

interface RpcClaimRevokeResult {
  ok: boolean;
  error?: string;
  claim_id?: string;
  from_status?: string;
  to_status?: string;
  already_revoked?: boolean;
  affected_receipt_ids?: string[];
}

export function isRevocationReasonCode(value: string): value is RevocationReasonCode {
  return (REVOCATION_REASON_CODES as readonly string[]).includes(value);
}

async function revokeDecisionReceiptAtomic(input: {
  receiptId: string;
  reasonCode: RevocationReasonCode;
  changedBy: string;
  idempotencyKey?: string;
}): Promise<RpcReceiptRevokeResult> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("revoke_decision_receipt_atomic", {
    p_receipt_id: input.receiptId,
    p_reason_code: input.reasonCode,
    p_changed_by: input.changedBy,
    p_idempotency_key: input.idempotencyKey ?? null,
  });

  if (error) return { ok: false, error: error.message };
  if (!data || typeof data !== "object") return { ok: false, error: "receipt_revoke_failed" };
  return data as RpcReceiptRevokeResult;
}

async function revokeCredentialClaimAtomic(input: {
  claimId: string;
  reasonCode: RevocationReasonCode;
  changedBy: string;
  idempotencyKey?: string;
}): Promise<RpcClaimRevokeResult> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("revoke_credential_claim_atomic", {
    p_claim_id: input.claimId,
    p_reason_code: input.reasonCode,
    p_changed_by: input.changedBy,
    p_idempotency_key: input.idempotencyKey ?? null,
  });

  if (error) return { ok: false, error: error.message };
  if (!data || typeof data !== "object") return { ok: false, error: "claim_revoke_failed" };
  return data as RpcClaimRevokeResult;
}

export async function revokeDecisionReceiptControlled(input: {
  receiptId: string;
  reasonCode: RevocationReasonCode;
  changedBy: string;
  idempotencyKey?: string;
}): Promise<RevokeDecisionReceiptResult | { ok: false; error: string }> {
  if (!isRevocationReasonCode(input.reasonCode)) {
    return { ok: false, error: "invalid_reason_code" };
  }

  const receiptId = input.receiptId.trim();
  if (!receiptId) return { ok: false, error: "receipt_id_required" };

  const record = await getReceiptById(receiptId);
  if (!record) return { ok: false, error: "receipt_not_found" };

  const rpc = await revokeDecisionReceiptAtomic(input);
  if (!rpc.ok) {
    return { ok: false, error: rpc.error ?? "receipt_revoke_failed" };
  }

  if (!rpc.already_revoked) {
    await appendAuditEvent({
      actor_type: "admin_operator",
      actor_id: input.changedBy,
      action: "decision_receipt.revoked",
      object_type: "decision_receipt",
      object_id: receiptId,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      metadata: {
        reason_code: input.reasonCode,
        verification_decision_id: rpc.decision_id ?? record.verification_decision_id,
        claim_ids: rpc.claim_ids ?? [],
        partner_id: record.partner_id,
      },
    });
  }

  return {
    ok: true,
    receiptId: rpc.receipt_id ?? receiptId,
    decisionId: rpc.decision_id ?? record.verification_decision_id,
    status: "revoked",
    revokedAt: rpc.revoked_at ?? new Date().toISOString(),
    reasonCode: (rpc.reason_code as RevocationReasonCode) ?? input.reasonCode,
    alreadyRevoked: rpc.already_revoked === true,
    claimIds: rpc.claim_ids ?? [],
  };
}

export async function revokeCredentialClaimControlled(input: {
  claimId: string;
  reasonCode: RevocationReasonCode;
  changedBy: string;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; claimId: string; status: "revoked"; alreadyRevoked: boolean; affectedReceiptIds: string[] }
  | { ok: false; error: string }
> {
  if (!isRevocationReasonCode(input.reasonCode)) {
    return { ok: false, error: "invalid_reason_code" };
  }

  const rpc = await revokeCredentialClaimAtomic(input);
  if (!rpc.ok) {
    return { ok: false, error: rpc.error ?? "claim_revoke_failed" };
  }

  if (!rpc.already_revoked) {
    await appendAuditEvent({
      actor_type: "admin_operator",
      actor_id: input.changedBy,
      action: "credential_status.revoked",
      object_type: "credential_claim",
      object_id: input.claimId,
      metadata: {
        reason_code: input.reasonCode,
        affected_receipt_ids: rpc.affected_receipt_ids ?? [],
      },
    });
  }

  return {
    ok: true,
    claimId: rpc.claim_id ?? input.claimId,
    status: "revoked",
    alreadyRevoked: rpc.already_revoked === true,
    affectedReceiptIds: rpc.affected_receipt_ids ?? [],
  };
}

export async function listSubjectPartnerAccess(
  subjectId: string,
  partnerId?: string,
): Promise<{
  subject_pseudonym_id: string;
  partner_id: string | null;
  claims: SubjectPartnerAccessItem[];
  receipts: SubjectPartnerReceiptItem[];
}> {
  const subject = normalizeSuiAddress(subjectId);
  const pseudonym = subjectPseudonymId(subject);
  const sb = requireSupabaseAdmin();
  const scopedPartnerId = partnerId?.trim() || null;

  const claims = (await getActiveClaims(subject)).map(claim => ({
    claim_id: claim.id,
    claim_type: claim.claim_type,
    status: claim.status,
    status_reason_code: claim.revocation_reference,
  }));

  let receiptQuery = sb
    .from("decision_receipts")
    .select("id, verification_decision_id, partner_id, policy_id, status, revoked_at, revocation_reason_code")
    .eq("subject_pseudonym_id", pseudonym);

  if (scopedPartnerId) {
    receiptQuery = receiptQuery.eq("partner_id", scopedPartnerId);
  }

  const { data: receiptRows } = await receiptQuery
    .order("evaluated_at", { ascending: false })
    .limit(50);

  const receipts = (receiptRows ?? []).map(row => ({
    receipt_id: row.id as string,
    decision_id: row.verification_decision_id as string,
    partner_id: row.partner_id as string,
    policy_id: row.policy_id as string,
    status: row.status as string,
    revoked_at: (row.revoked_at as string | null) ?? null,
    revocation_reason_code: (row.revocation_reason_code as string | null) ?? null,
  }));

  const scopedClaims = scopedPartnerId
    ? await filterClaimsToPartnerScope(claims, receipts, scopedPartnerId)
    : claims;

  return {
    subject_pseudonym_id: pseudonym,
    partner_id: scopedPartnerId,
    claims: scopedClaims,
    receipts,
  };
}

async function filterClaimsToPartnerScope(
  claims: SubjectPartnerAccessItem[],
  receipts: SubjectPartnerReceiptItem[],
  partnerId: string,
): Promise<SubjectPartnerAccessItem[]> {
  if (!receipts.length) return [];

  const sb = requireSupabaseAdmin();
  const receiptIds = receipts
    .filter(receipt => receipt.partner_id === partnerId)
    .map(receipt => receipt.receipt_id);

  if (!receiptIds.length) return [];

  const { data } = await sb
    .from("receipt_claim_dependencies")
    .select("claim_id")
    .in("receipt_id", receiptIds);

  const claimIds = new Set((data ?? []).map(row => row.claim_id as string));
  return claims.filter(claim => claimIds.has(claim.claim_id));
}

export async function revokeSubjectPartnerAccess(input: {
  subjectId: string;
  partnerId: string;
  reasonCode: RevocationReasonCode;
  changedBy: string;
  idempotencyKey?: string;
}): Promise<{
  ok: true;
  partnerId: string;
  revokedReceiptIds: string[];
  alreadyRevokedReceiptIds: string[];
  skippedForeignReceiptIds: string[];
}> {
  const subject = normalizeSuiAddress(input.subjectId);
  const partnerId = input.partnerId.trim();
  if (!partnerId) {
    throw new Error("partner_id_required");
  }

  const access = await listSubjectPartnerAccess(subject, partnerId);
  const revokedReceiptIds: string[] = [];
  const alreadyRevokedReceiptIds: string[] = [];
  const skippedForeignReceiptIds: string[] = [];

  for (const receipt of access.receipts) {
    if (receipt.partner_id !== partnerId) {
      skippedForeignReceiptIds.push(receipt.receipt_id);
      continue;
    }
    if (receipt.status === "revoked") {
      alreadyRevokedReceiptIds.push(receipt.receipt_id);
      continue;
    }
    if (receipt.status !== "active") continue;

    const receiptKey = input.idempotencyKey
      ? `${input.idempotencyKey}:receipt:${receipt.receipt_id}`
      : undefined;
    const result = await revokeDecisionReceiptControlled({
      receiptId: receipt.receipt_id,
      reasonCode: input.reasonCode,
      changedBy: input.changedBy,
      idempotencyKey: receiptKey,
    });
    if (result.ok) {
      if (result.alreadyRevoked) alreadyRevokedReceiptIds.push(receipt.receipt_id);
      else revokedReceiptIds.push(receipt.receipt_id);
    }
  }

  await appendAuditEvent({
    actor_type: "admin_operator",
    actor_id: input.changedBy,
    action: "subject_partner_access.revoked",
    object_type: "subject_pseudonym",
    object_id: access.subject_pseudonym_id,
    metadata: {
      partner_id: partnerId,
      reason_code: input.reasonCode,
      revoked_receipt_ids: revokedReceiptIds,
      already_revoked_receipt_ids: alreadyRevokedReceiptIds,
      skipped_foreign_receipt_ids: skippedForeignReceiptIds,
    },
  });

  return {
    ok: true,
    partnerId,
    revokedReceiptIds,
    alreadyRevokedReceiptIds,
    skippedForeignReceiptIds,
  };
}

export function revocationAuditMetadataHasNoPii(metadata: Record<string, unknown>): boolean {
  const text = JSON.stringify(metadata).toLowerCase();
  return !text.includes("@")
    && !text.includes("reviewer")
    && !text.includes("note")
    && !text.includes("0x");
}
