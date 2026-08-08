// FILE: lib/privacy/privacyControlPlane.ts
// Holder privacy requests — append-only ledger, admin review, safe deletion (access revoke only).

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { revokeSubjectClaims } from "@/lib/credentials/claimsService";
import { appendAuditEvent } from "@/lib/verification/audit";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  buildPrivacyAuditMetadata,
  privacyAuditMetadataHasNoPii,
} from "@/lib/privacy/privacyAuditContract";
import {
  isPrivacyReasonCode,
  isPrivacyRequestType,
  isPrivacyRequestStatus,
  toAdminView,
  toHolderView,
  type AdminPrivacyRequestView,
  type HolderPrivacyRequestView,
  type PrivacyChangedByCategory,
  type PrivacyReasonCode,
  type PrivacyRequestRecord,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from "@/lib/privacy/types";

export { privacyAuditMetadataHasNoPii };

const TABLE = "privacy_requests";
const EVENTS = "privacy_request_events";

function mapRequestRow(row: Record<string, unknown>): PrivacyRequestRecord {
  return {
    id: row.id as string,
    subject_sui: row.subject_sui as string,
    subject_pseudonym_id: row.subject_pseudonym_id as string,
    request_type: row.request_type as PrivacyRequestType,
    status: row.status as PrivacyRequestStatus,
    reason_code: (row.reason_code as PrivacyReasonCode | null) ?? null,
    idempotency_key: (row.idempotency_key as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function appendPrivacyEvent(input: {
  requestId: string;
  fromStatus: PrivacyRequestStatus | null;
  toStatus: PrivacyRequestStatus;
  reasonCode: PrivacyReasonCode;
  changedByCategory: PrivacyChangedByCategory;
  adminActorCategory?: AdminActorCategory | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = requireSupabaseAdmin();
  const metadata = input.metadata ?? buildPrivacyAuditMetadata({
    requestType: "unknown",
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    reasonCode: input.reasonCode,
    changedByCategory: input.changedByCategory,
    adminActorCategory: input.adminActorCategory ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    outcome: input.toStatus,
  });

  if (!privacyAuditMetadataHasNoPii(metadata)) {
    return { ok: false, error: "audit_metadata_contains_pii" };
  }

  if (input.idempotencyKey) {
    const { data: existing } = await sb
      .from(EVENTS)
      .select("id")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) return { ok: true };
  }

  const { error } = await sb.from(EVENTS).insert({
    request_id: input.requestId,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    reason_code: input.reasonCode,
    changed_by_category: input.changedByCategory,
    admin_actor_category: input.adminActorCategory ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    metadata,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function updateRequestStatus(
  requestId: string,
  status: PrivacyRequestStatus,
  reasonCode: PrivacyReasonCode,
): Promise<PrivacyRequestRecord | null> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from(TABLE)
    .update({ status, reason_code: reasonCode, updated_at: now })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapRequestRow(data);
}

export async function createPrivacyRequest(input: {
  subjectSui: string;
  requestType: PrivacyRequestType;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; request: HolderPrivacyRequestView; created: boolean }
  | { ok: false; error: string }
> {
  if (!isPrivacyRequestType(input.requestType)) {
    return { ok: false, error: "invalid_request_type" };
  }

  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.subjectSui);
  const pseudonym = subjectPseudonymId(subject);
  const idempotencyKey = input.idempotencyKey
    ?? `privacy:${input.requestType}:${subject}:${Date.now()}`;

  if (input.idempotencyKey) {
    const { data: existing } = await sb
      .from(TABLE)
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return { ok: true, request: toHolderView(mapRequestRow(existing)), created: false };
    }
  }

  const { data, error } = await sb
    .from(TABLE)
    .insert({
      subject_sui: subject,
      subject_pseudonym_id: pseudonym,
      request_type: input.requestType,
      status: "requested",
      reason_code: "holder_requested",
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505" && input.idempotencyKey) {
      const { data: replay } = await sb
        .from(TABLE)
        .select("*")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (replay) {
        return { ok: true, request: toHolderView(mapRequestRow(replay)), created: false };
      }
    }
    return { ok: false, error: error?.message ?? "create_failed" };
  }

  const record = mapRequestRow(data);
  const eventResult = await appendPrivacyEvent({
    requestId: record.id,
    fromStatus: null,
    toStatus: "requested",
    reasonCode: "holder_requested",
    changedByCategory: "holder",
    idempotencyKey: `event:create:${idempotencyKey}`,
    metadata: buildPrivacyAuditMetadata({
      requestType: input.requestType,
      fromStatus: null,
      toStatus: "requested",
      reasonCode: "holder_requested",
      changedByCategory: "holder",
      idempotencyKey,
      outcome: "created",
    }),
  });

  if (!eventResult.ok) return { ok: false, error: eventResult.error };

  await appendAuditEvent({
    actor_type: "holder",
    actor_id: pseudonym,
    action: "privacy.request.created",
    object_type: "privacy_request",
    object_id: record.id,
    metadata: buildPrivacyAuditMetadata({
      requestType: input.requestType,
      fromStatus: null,
      toStatus: "requested",
      reasonCode: "holder_requested",
      changedByCategory: "holder",
      idempotencyKey,
      outcome: "created",
    }),
  });

  return { ok: true, request: toHolderView(record), created: true };
}

export async function listPrivacyRequestsForSubject(
  subjectSui: string,
): Promise<HolderPrivacyRequestView[]> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(subjectSui);
  const { data } = await sb
    .from(TABLE)
    .select("*")
    .eq("subject_sui", subject)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map(row => toHolderView(mapRequestRow(row)));
}

export async function listPrivacyRequestsForAdmin(
  statusFilter?: PrivacyRequestStatus,
): Promise<AdminPrivacyRequestView[]> {
  const sb = requireSupabaseAdmin();
  let query = sb.from(TABLE).select("*").order("created_at", { ascending: false }).limit(100);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data } = await query;
  return (data ?? []).map(row => toAdminView(mapRequestRow(row)));
}

export async function getPrivacyRequestById(
  requestId: string,
): Promise<PrivacyRequestRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb.from(TABLE).select("*").eq("id", requestId).maybeSingle();
  return data ? mapRequestRow(data) : null;
}

export function subjectOwnsRequest(
  record: PrivacyRequestRecord,
  subjectSui: string,
): boolean {
  return record.subject_sui === normalizeSuiAddress(subjectSui);
}

async function transitionRequest(input: {
  requestId: string;
  toStatus: PrivacyRequestStatus;
  reasonCode: PrivacyReasonCode;
  changedByCategory: PrivacyChangedByCategory;
  adminActorCategory?: AdminActorCategory | null;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<
  | { ok: true; request: PrivacyRequestRecord }
  | { ok: false; error: string }
> {
  if (!isPrivacyRequestStatus(input.toStatus) || !isPrivacyReasonCode(input.reasonCode)) {
    return { ok: false, error: "invalid_transition" };
  }

  const existing = await getPrivacyRequestById(input.requestId);
  if (!existing) return { ok: false, error: "request_not_found" };
  if (existing.status === input.toStatus) {
    return { ok: true, request: existing };
  }

  const metadata = input.metadata ?? buildPrivacyAuditMetadata({
    requestType: existing.request_type,
    fromStatus: existing.status,
    toStatus: input.toStatus,
    reasonCode: input.reasonCode,
    changedByCategory: input.changedByCategory,
    adminActorCategory: input.adminActorCategory ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    outcome: input.toStatus,
  });

  const eventResult = await appendPrivacyEvent({
    requestId: input.requestId,
    fromStatus: existing.status,
    toStatus: input.toStatus,
    reasonCode: input.reasonCode,
    changedByCategory: input.changedByCategory,
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: input.idempotencyKey,
    metadata,
  });
  if (!eventResult.ok) return { ok: false, error: eventResult.error };

  const updated = await updateRequestStatus(input.requestId, input.toStatus, input.reasonCode);
  if (!updated) return { ok: false, error: "update_failed" };

  await appendAuditEvent({
    actor_type: input.changedByCategory === "holder" ? "holder" : "admin",
    actor_id: input.adminActorCategory ?? existing.subject_pseudonym_id,
    action: "privacy.request.status_changed",
    object_type: "privacy_request",
    object_id: input.requestId,
    metadata,
  });

  return { ok: true, request: updated };
}

export async function startPrivacyRequestReview(input: {
  requestId: string;
  adminActorCategory: AdminActorCategory;
  idempotencyKey?: string;
}): Promise<{ ok: true; request: AdminPrivacyRequestView } | { ok: false; error: string }> {
  const result = await transitionRequest({
    requestId: input.requestId,
    toStatus: "under_review",
    reasonCode: "operator_review_started",
    changedByCategory: "admin",
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: input.idempotencyKey ?? `review:${input.requestId}`,
  });
  if (!result.ok) return result;
  return { ok: true, request: toAdminView(result.request) };
}

export async function denyPrivacyRequest(input: {
  requestId: string;
  adminActorCategory: AdminActorCategory;
  reasonCode?: PrivacyReasonCode;
  idempotencyKey?: string;
}): Promise<{ ok: true; request: AdminPrivacyRequestView } | { ok: false; error: string }> {
  const result = await transitionRequest({
    requestId: input.requestId,
    toStatus: "denied",
    reasonCode: input.reasonCode ?? "operator_denied",
    changedByCategory: "admin",
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: input.idempotencyKey ?? `deny:${input.requestId}`,
  });
  if (!result.ok) return result;
  return { ok: true, request: toAdminView(result.request) };
}

export async function approveExportPrivacyRequest(input: {
  requestId: string;
  adminActorCategory: AdminActorCategory;
  idempotencyKey?: string;
}): Promise<{ ok: true; request: AdminPrivacyRequestView } | { ok: false; error: string }> {
  const existing = await getPrivacyRequestById(input.requestId);
  if (!existing) return { ok: false, error: "request_not_found" };
  if (existing.request_type !== "data_export") {
    return { ok: false, error: "not_export_request" };
  }

  const result = await transitionRequest({
    requestId: input.requestId,
    toStatus: "approved",
    reasonCode: "export_prepared",
    changedByCategory: "admin",
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: input.idempotencyKey ?? `approve_export:${input.requestId}`,
    metadata: buildPrivacyAuditMetadata({
      requestType: existing.request_type,
      fromStatus: existing.status,
      toStatus: "approved",
      reasonCode: "export_prepared",
      changedByCategory: "admin",
      adminActorCategory: input.adminActorCategory,
      idempotencyKey: input.idempotencyKey ?? null,
      outcome: "export_approved_admin_fulfillment",
    }),
  });
  if (!result.ok) return result;
  return { ok: true, request: toAdminView(result.request) };
}

export async function completePrivacyRequest(input: {
  requestId: string;
  adminActorCategory: AdminActorCategory;
  idempotencyKey?: string;
}): Promise<{ ok: true; request: AdminPrivacyRequestView } | { ok: false; error: string }> {
  const result = await transitionRequest({
    requestId: input.requestId,
    toStatus: "completed",
    reasonCode: "operator_completed",
    changedByCategory: "admin",
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: input.idempotencyKey ?? `complete:${input.requestId}`,
  });
  if (!result.ok) return result;
  return { ok: true, request: toAdminView(result.request) };
}

export async function placePrivacyRequestOnLegalHold(input: {
  requestId: string;
  adminActorCategory: AdminActorCategory;
  idempotencyKey?: string;
}): Promise<{ ok: true; request: AdminPrivacyRequestView } | { ok: false; error: string }> {
  const result = await transitionRequest({
    requestId: input.requestId,
    toStatus: "legal_hold",
    reasonCode: "legal_hold_active",
    changedByCategory: "admin",
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: input.idempotencyKey ?? `legal_hold:${input.requestId}`,
    metadata: buildPrivacyAuditMetadata({
      requestType: "account_deletion",
      fromStatus: null,
      toStatus: "legal_hold",
      reasonCode: "legal_hold_active",
      changedByCategory: "admin",
      adminActorCategory: input.adminActorCategory,
      outcome: "legal_hold_applied",
    }),
  });
  if (!result.ok) return result;
  return { ok: true, request: toAdminView(result.request) };
}

/**
 * Approved deletion: revoke access/credentials only — never purge storage or audit rows.
 */
export async function approveDeletionPrivacyRequest(input: {
  requestId: string;
  adminActorCategory: AdminActorCategory;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; request: AdminPrivacyRequestView; accessRevoked: boolean }
  | { ok: false; error: string }
> {
  const existing = await getPrivacyRequestById(input.requestId);
  if (!existing) return { ok: false, error: "request_not_found" };
  if (existing.request_type !== "account_deletion") {
    return { ok: false, error: "not_deletion_request" };
  }
  if (existing.status === "access_revoked_pending_purge" || existing.status === "completed") {
    return { ok: true, request: toAdminView(existing), accessRevoked: true };
  }

  const approveKey = input.idempotencyKey ?? `approve_deletion:${input.requestId}`;

  const approved = await transitionRequest({
    requestId: input.requestId,
    toStatus: "approved",
    reasonCode: "deletion_access_revoked",
    changedByCategory: "admin",
    adminActorCategory: input.adminActorCategory,
    idempotencyKey: `${approveKey}:approved`,
    metadata: buildPrivacyAuditMetadata({
      requestType: existing.request_type,
      fromStatus: existing.status,
      toStatus: "approved",
      reasonCode: "deletion_access_revoked",
      changedByCategory: "admin",
      adminActorCategory: input.adminActorCategory,
      idempotencyKey: approveKey,
      accessRevoked: false,
      purgePending: true,
      outcome: "deletion_approved",
    }),
  });
  if (!approved.ok) return approved;

  await revokeSubjectClaims(existing.subject_sui, "privacy_deletion_approved");

  const sb = requireSupabaseAdmin();
  await sb.from("identity_verifications")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .or(`sui_address.eq.${existing.subject_sui},wallet_address.eq.${existing.subject_sui}`);

  const pending = await transitionRequest({
    requestId: input.requestId,
    toStatus: "access_revoked_pending_purge",
    reasonCode: "deletion_purge_pending",
    changedByCategory: "system",
    idempotencyKey: `${approveKey}:pending_purge`,
    metadata: buildPrivacyAuditMetadata({
      requestType: existing.request_type,
      fromStatus: "approved",
      toStatus: "access_revoked_pending_purge",
      reasonCode: "deletion_purge_pending",
      changedByCategory: "system",
      adminActorCategory: input.adminActorCategory,
      idempotencyKey: approveKey,
      accessRevoked: true,
      purgePending: true,
      outcome: "access_revoked_no_purge",
    }),
  });
  if (!pending.ok) return pending;

  return { ok: true, request: toAdminView(pending.request), accessRevoked: true };
}

/** User request alone never performs destructive actions. */
export function userRequestIsNonDestructive(): true {
  return true;
}
