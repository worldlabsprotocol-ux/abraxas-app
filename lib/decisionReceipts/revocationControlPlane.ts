// FILE: lib/decisionReceipts/revocationControlPlane.ts
// Admin-only credential and partner receipt revocation — idempotent, audited, non-PII.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { getReceiptDependencies } from "@/lib/decisionReceipts/dependencies";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { transitionClaimStatus } from "@/lib/trust/credentialStatusRegistry";
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

export function isRevocationReasonCode(value: string): value is RevocationReasonCode {
  return (REVOCATION_REASON_CODES as readonly string[]).includes(value);
}

async function loadRevocationEventByKey(idempotencyKey: string) {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("decision_receipt_revocation_events")
    .select("receipt_id, verification_decision_id, reason_code, created_at, claim_ids")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data;
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

  if (input.idempotencyKey) {
    const existingEvent = await loadRevocationEventByKey(input.idempotencyKey);
    if (existingEvent) {
      return {
        ok: true,
        receiptId: existingEvent.receipt_id as string,
        decisionId: existingEvent.verification_decision_id as string,
        status: "revoked",
        revokedAt: existingEvent.created_at as string,
        reasonCode: existingEvent.reason_code as RevocationReasonCode,
        alreadyRevoked: true,
        claimIds: (existingEvent.claim_ids as string[]) ?? [],
      };
    }
  }

  const record = await getReceiptById(receiptId);
  if (!record) return { ok: false, error: "receipt_not_found" };

  const deps = await getReceiptDependencies(receiptId);
  const claimIds = deps.length
    ? deps.map(dep => dep.claim_id as string)
    : record.evaluated_claim_refs.map(ref => ref.claim_id);

  if (record.status === "revoked" || record.revoked_at) {
    return {
      ok: true,
      receiptId: record.id,
      decisionId: record.verification_decision_id,
      status: "revoked",
      revokedAt: record.revoked_at ?? new Date().toISOString(),
      reasonCode: input.reasonCode,
      alreadyRevoked: true,
      claimIds,
    };
  }

  if (record.status !== "active") {
    return { ok: false, error: "receipt_not_active" };
  }

  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("decision_receipts")
    .update({
      status: "revoked",
      revoked_at: now,
      revocation_reason_code: input.reasonCode,
    })
    .eq("id", receiptId)
    .eq("status", "active")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    const raced = await getReceiptById(receiptId);
    if (raced?.status === "revoked") {
      return {
        ok: true,
        receiptId: raced.id,
        decisionId: raced.verification_decision_id,
        status: "revoked",
        revokedAt: raced.revoked_at ?? now,
        reasonCode: input.reasonCode,
        alreadyRevoked: true,
        claimIds,
      };
    }
    return { ok: false, error: "receipt_revoke_failed" };
  }

  await sb.from("decision_receipt_revocation_events").insert({
    receipt_id: receiptId,
    verification_decision_id: record.verification_decision_id,
    reason_code: input.reasonCode,
    changed_by: input.changedBy,
    idempotency_key: input.idempotencyKey ?? null,
    claim_ids: claimIds,
  });

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
      verification_decision_id: record.verification_decision_id,
      claim_ids: claimIds,
      partner_id: record.partner_id,
    },
  });

  return {
    ok: true,
    receiptId,
    decisionId: record.verification_decision_id,
    status: "revoked",
    revokedAt: now,
    reasonCode: input.reasonCode,
    alreadyRevoked: false,
    claimIds,
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

  const result = await transitionClaimStatus({
    claimId: input.claimId,
    toStatus: "revoked",
    reasonCode: input.reasonCode,
    changedBy: input.changedBy,
    idempotencyKey: input.idempotencyKey,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const sb = requireSupabaseAdmin();
  const { data: event } = await sb
    .from("credential_status_events")
    .select("affected_receipt_ids")
    .eq("claim_id", input.claimId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ok: true,
    claimId: input.claimId,
    status: "revoked",
    alreadyRevoked: result.from === "revoked",
    affectedReceiptIds: (event?.affected_receipt_ids as string[]) ?? [],
  };
}

export async function listSubjectPartnerAccess(subjectId: string): Promise<{
  subject_pseudonym_id: string;
  claims: SubjectPartnerAccessItem[];
  receipts: SubjectPartnerReceiptItem[];
}> {
  const subject = normalizeSuiAddress(subjectId);
  const pseudonym = subjectPseudonymId(subject);
  const sb = requireSupabaseAdmin();

  const claims = (await getActiveClaims(subject)).map(claim => ({
    claim_id: claim.id,
    claim_type: claim.claim_type,
    status: claim.status,
    status_reason_code: claim.revocation_reference,
  }));

  const { data: receiptRows } = await sb
    .from("decision_receipts")
    .select("id, verification_decision_id, partner_id, policy_id, status, revoked_at, revocation_reason_code")
    .eq("subject_pseudonym_id", pseudonym)
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

  return {
    subject_pseudonym_id: pseudonym,
    claims,
    receipts,
  };
}

export async function revokeSubjectPartnerAccess(input: {
  subjectId: string;
  reasonCode: RevocationReasonCode;
  changedBy: string;
  idempotencyKey?: string;
}): Promise<{
  ok: true;
  revokedClaimIds: string[];
  revokedReceiptIds: string[];
  alreadyRevokedReceiptIds: string[];
}> {
  const subject = normalizeSuiAddress(input.subjectId);
  const access = await listSubjectPartnerAccess(subject);
  const revokedClaimIds: string[] = [];
  const revokedReceiptIds: string[] = [];
  const alreadyRevokedReceiptIds: string[] = [];

  for (const claim of access.claims) {
    const claimKey = input.idempotencyKey ? `${input.idempotencyKey}:claim:${claim.claim_id}` : undefined;
    const result = await revokeCredentialClaimControlled({
      claimId: claim.claim_id,
      reasonCode: input.reasonCode,
      changedBy: input.changedBy,
      idempotencyKey: claimKey,
    });
    if (result.ok) revokedClaimIds.push(claim.claim_id);
  }

  for (const receipt of access.receipts) {
    if (receipt.status === "revoked") {
      alreadyRevokedReceiptIds.push(receipt.receipt_id);
      continue;
    }
    if (receipt.status !== "active") continue;

    const receiptKey = input.idempotencyKey ? `${input.idempotencyKey}:receipt:${receipt.receipt_id}` : undefined;
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
      reason_code: input.reasonCode,
      revoked_claim_ids: revokedClaimIds,
      revoked_receipt_ids: revokedReceiptIds,
      already_revoked_receipt_ids: alreadyRevokedReceiptIds,
    },
  });

  return {
    ok: true,
    revokedClaimIds,
    revokedReceiptIds,
    alreadyRevokedReceiptIds,
  };
}

export function revocationAuditMetadataHasNoPii(metadata: Record<string, unknown>): boolean {
  const text = JSON.stringify(metadata).toLowerCase();
  return !text.includes("@")
    && !text.includes("reviewer")
    && !text.includes("note")
    && !text.includes("0x");
}
