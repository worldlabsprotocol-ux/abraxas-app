// FILE: lib/privacy/privacyControlPlane.ts
// Holder privacy requests — append-only ledger, admin review, safe deletion (access revoke only).

import { normalizeStoredHolderKey } from "@/lib/auth/holderSubject/normalizeSubjectKey";
import { createHash } from "node:crypto";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { appendAuditEvent } from "@/lib/verification/audit";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg, withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import type { AdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  buildPrivacyAuditMetadata,
  privacyAuditMetadataHasNoPii,
} from "@/lib/privacy/privacyAuditContract";
import {
  isPrivacyReasonCode,
  isPrivacyRequestType,
  isPrivacyRequestStatus,
  PRIVACY_ACTIVE_STATUSES,
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

  if (persistenceUsesDirectPostgres()) {
    const subject = normalizeStoredHolderKey(input.subjectSui);
    if (!isChainNeutralHolderSubjectId(subject)) return { ok: false, error: "canonical_holder_required" };
    const pseudonym = subjectPseudonymId(subject);
    const idempotencyKey = input.idempotencyKey ?? `privacy:${input.requestType}:${subject}:${Date.now()}`;
    return withAbraxasPgTransaction(async (client) => {
      const holder = await client.query(
        `select subject_id from public.passport_holder_subjects
         where subject_id = $1 and status = 'active' for update`,
        [subject],
      );
      if (!holder.rows.length) return { ok: false as const, error: "canonical_holder_required" };
      const existing = await client.query<Record<string, unknown>>(
        `select id::text, subject_sui, subject_pseudonym_id, request_type, status,
                reason_code, idempotency_key, created_at::text, updated_at::text
         from public.privacy_requests where idempotency_key = $1
            or (subject_sui = $2 and request_type = $3 and status = any($4::text[]))
         order by (idempotency_key = $1) desc, created_at desc limit 1`,
        [idempotencyKey, subject, input.requestType, [...PRIVACY_ACTIVE_STATUSES]],
      );
      if (existing.rows[0]) {
        const record = mapRequestRow(existing.rows[0]);
        if (record.subject_sui !== subject) return { ok: false as const, error: "privacy_request_owner_mismatch" };
        return { ok: true as const, request: toHolderView(record), created: false };
      }
      const inserted = await client.query<Record<string, unknown>>(
        `insert into public.privacy_requests
           (subject_sui, subject_pseudonym_id, request_type, status, reason_code, idempotency_key)
         values ($1, $2, $3, 'requested', 'holder_requested', $4)
         returning id::text, subject_sui, subject_pseudonym_id, request_type, status,
                   reason_code, idempotency_key, created_at::text, updated_at::text`,
        [subject, pseudonym, input.requestType, idempotencyKey],
      );
      const record = mapRequestRow(inserted.rows[0]);
      const metadata = buildPrivacyAuditMetadata({
        requestType: input.requestType, fromStatus: null, toStatus: "requested",
        reasonCode: "holder_requested", changedByCategory: "holder", idempotencyKey, outcome: "created",
      });
      if (!privacyAuditMetadataHasNoPii(metadata)) throw new Error("audit_metadata_contains_pii");
      await client.query(
        `insert into public.privacy_request_events
           (request_id, from_status, to_status, reason_code, changed_by_category, idempotency_key, metadata)
         values ($1::uuid, null, 'requested', 'holder_requested', 'holder', $2, $3::jsonb)`,
        [record.id, `event:create:${idempotencyKey}`, JSON.stringify(metadata)],
      );
      await client.query(
        `insert into public.audit_events
           (actor_type, actor_id, action, object_type, object_id, metadata, event_hash)
         values ('holder', $1, 'privacy.request.created', 'privacy_request', $2, $3::jsonb, $4)`,
        [pseudonym, record.id, JSON.stringify(metadata), createHash("sha256").update(JSON.stringify({
          actor_type: "holder", actor_id: pseudonym, action: "privacy.request.created",
          object_type: "privacy_request", object_id: record.id, metadata, ts: new Date().toISOString(),
        })).digest("hex")],
      );
      return { ok: true as const, request: toHolderView(record), created: true };
    });
  }

  const sb = requireSupabaseAdmin();
  const subject = normalizeStoredHolderKey(input.subjectSui);
  const pseudonym = subjectPseudonymId(subject);
  const idempotencyKey = input.idempotencyKey
    ?? `privacy:${input.requestType}:${subject}:${Date.now()}`;

  if (input.idempotencyKey) {
    const { data: existing } = await sb
      .from(TABLE)
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing && existing.subject_sui !== subject) {
      return { ok: false, error: "privacy_request_owner_mismatch" };
    }
    if (existing) {
      return { ok: true, request: toHolderView(mapRequestRow(existing)), created: false };
    }
  }

  const { data: activeExisting } = await sb
    .from(TABLE)
    .select("*")
    .eq("subject_sui", subject)
    .eq("request_type", input.requestType)
    .in("status", [...PRIVACY_ACTIVE_STATUSES])
    .maybeSingle();

  if (activeExisting) {
    return { ok: true, request: toHolderView(mapRequestRow(activeExisting)), created: false };
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
    if (error?.code === "23505") {
      const { data: replay } = await sb
        .from(TABLE)
        .select("*")
        .eq("subject_sui", subject)
        .eq("request_type", input.requestType)
        .in("status", [...PRIVACY_ACTIVE_STATUSES])
        .maybeSingle();
      if (replay) {
        return { ok: true, request: toHolderView(mapRequestRow(replay)), created: false };
      }
      if (input.idempotencyKey) {
        const { data: idemReplay } = await sb
          .from(TABLE)
          .select("*")
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (idemReplay && idemReplay.subject_sui !== subject) {
          return { ok: false, error: "privacy_request_owner_mismatch" };
        }
        if (idemReplay) {
          return { ok: true, request: toHolderView(mapRequestRow(idemReplay)), created: false };
        }
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
  if (persistenceUsesDirectPostgres()) {
    const subject = normalizeStoredHolderKey(subjectSui);
    if (!isChainNeutralHolderSubjectId(subject)) throw new Error("canonical_holder_required");
    const { rows } = await queryAbraxasPg<Record<string, unknown>>(
      `select id::text, subject_sui, subject_pseudonym_id, request_type, status,
              reason_code, idempotency_key, created_at::text, updated_at::text
       from public.privacy_requests where subject_sui = $1
       order by created_at desc limit 50`,
      [subject],
    );
    return rows.map(row => toHolderView(mapRequestRow(row)));
  }
  const sb = requireSupabaseAdmin();
  const subject = normalizeStoredHolderKey(subjectSui);
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
  return record.subject_sui === normalizeStoredHolderKey(subjectSui);
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
 * Approved deletion: atomic RPC revokes access/credentials — never purges storage or audit rows.
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
  const canonicalHolder = isChainNeutralHolderSubjectId(existing.subject_sui);
  if (!canonicalHolder && (existing.status === "access_revoked_pending_purge" || existing.status === "completed")) {
    return { ok: true, request: toAdminView(existing), accessRevoked: true };
  }

  const approveKey = input.idempotencyKey ?? `approve_deletion:${input.requestId}`;
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc(canonicalHolder
    ? "approve_privacy_deletion_holder_atomic"
    : "approve_privacy_deletion_atomic", {
    p_request_id: input.requestId,
    p_admin_actor_category: input.adminActorCategory,
    p_idempotency_key: approveKey,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as {
    ok?: boolean;
    error?: string;
    request_id?: string;
    status?: PrivacyRequestStatus;
    access_revoked?: boolean;
  };

  if (!result?.ok || result.access_revoked !== true) {
    return { ok: false, error: result?.error ?? "deletion_approve_failed" };
  }

  const updated = await getPrivacyRequestById(input.requestId);
  if (!updated || updated.status !== "access_revoked_pending_purge") {
    return { ok: false, error: "deletion_status_unconfirmed" };
  }

  return {
    ok: true,
    request: toAdminView(updated),
    accessRevoked: true,
  };
}

/** User request alone never performs destructive actions. */
export function userRequestIsNonDestructive(): true {
  return true;
}
