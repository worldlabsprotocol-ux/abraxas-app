// FILE: lib/idv/rawEvidencePurge.ts
// Provider-neutral purge of temporary raw identity evidence (preserves audit + credentials).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  computeRawEvidenceEligibleBefore,
  resolveRawEvidenceRetentionDays,
} from "@/lib/idv/rawEvidenceRetention";
import type { IdentityReviewSessionRow } from "@/lib/idv/identityReviewSession";

const PURGED_STORAGE_MARKER = "purged://";
const STORAGE_BUCKET = "passport-documents";

export interface PurgeAuditEvent {
  type: "raw_evidence_purge";
  event: string;
  ts: string;
  capture_session_id: string;
  session_id?: string;
  dry_run?: boolean;
  storage_objects_removed?: number;
  document_rows_redacted?: number;
  error_code?: string;
}

function logPurgeEvent(meta: Omit<PurgeAuditEvent, "type" | "ts">): void {
  console.warn(JSON.stringify({
    type: "raw_evidence_purge",
    ts: new Date().toISOString(),
    ...meta,
  }));
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface PurgeEligibleSession {
  session_id: string;
  capture_session_id: string;
  review_status: string;
  partner_id: string | null;
  policy_id: string | null;
  raw_evidence_retained_until: string | null;
  raw_evidence_purged_at: string | null;
}

export async function findPurgeEligibleSessions(
  sb: SupabaseClient,
  input?: { captureSessionId?: string; limit?: number },
): Promise<
  | { ok: true; sessions: PurgeEligibleSession[] }
  | { ok: false; error: string }
> {
  const retention = resolveRawEvidenceRetentionDays();
  if (!retention.ok) {
    return { ok: false, error: retention.error };
  }

  const cutoff = computeRawEvidenceEligibleBefore(retention.retentionDays);
  let query = sb
    .from("identity_review_sessions")
    .select("id, capture_session_id, review_status, partner_id, policy_id, raw_evidence_retained_until, raw_evidence_purged_at, updated_at")
    .is("raw_evidence_purged_at", null)
    .in("review_status", ["approved", "rejected", "expired"])
    .lte("updated_at", cutoff.toISOString())
    .order("updated_at", { ascending: true })
    .limit(input?.limit ?? 100);

  if (input?.captureSessionId) {
    query = query.eq("capture_session_id", input.captureSessionId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const sessions = (data ?? []).map(row => ({
    session_id: row.id as string,
    capture_session_id: row.capture_session_id as string,
    review_status: row.review_status as string,
    partner_id: row.partner_id as string | null,
    policy_id: row.policy_id as string | null,
    raw_evidence_retained_until: row.raw_evidence_retained_until as string | null,
    raw_evidence_purged_at: row.raw_evidence_purged_at as string | null,
  }));

  return { ok: true, sessions };
}

async function removeStorageObject(sb: SupabaseClient, path: string): Promise<boolean> {
  if (!path || path.startsWith(PURGED_STORAGE_MARKER)) return true;
  const { error } = await sb.storage.from(STORAGE_BUCKET).remove([path]);
  return !error;
}

export interface PurgeRawEvidenceResult {
  ok: boolean;
  capture_session_id: string;
  session_id?: string;
  dry_run: boolean;
  already_purged?: boolean;
  storage_objects_removed?: number;
  document_rows_redacted?: number;
  error?: string;
  error_code?: string;
}

export async function purgeRawEvidenceForSession(
  captureSessionId: string,
  input?: { dryRun?: boolean; sb?: SupabaseClient; force?: boolean },
): Promise<PurgeRawEvidenceResult> {
  const sb = input?.sb ?? getSupabase();
  if (!sb) {
    return {
      ok: false,
      capture_session_id: captureSessionId,
      dry_run: input?.dryRun ?? false,
      error: "supabase_not_configured",
      error_code: "supabase_not_configured",
    };
  }

  const { data: session } = await sb
    .from("identity_review_sessions")
    .select("*")
    .eq("capture_session_id", captureSessionId)
    .maybeSingle();

  if (!session) {
    return {
      ok: false,
      capture_session_id: captureSessionId,
      dry_run: input?.dryRun ?? false,
      error: "session_not_found",
      error_code: "session_not_found",
    };
  }

  const row = session as IdentityReviewSessionRow;
  if (row.raw_evidence_purged_at) {
    logPurgeEvent({
      event: "purge_idempotent_skip",
      capture_session_id: captureSessionId,
      session_id: row.id,
      dry_run: input?.dryRun ?? false,
    });
    return {
      ok: true,
      capture_session_id: captureSessionId,
      session_id: row.id,
      dry_run: input?.dryRun ?? false,
      already_purged: true,
      storage_objects_removed: 0,
      document_rows_redacted: 0,
    };
  }

  if (!input?.force) {
    const retention = resolveRawEvidenceRetentionDays();
    if (!retention.ok) {
      return {
        ok: false,
        capture_session_id: captureSessionId,
        session_id: row.id,
        dry_run: input?.dryRun ?? false,
        error: retention.error,
        error_code: "retention_not_configured",
      };
    }
    const cutoff = computeRawEvidenceEligibleBefore(retention.retentionDays);
    if (new Date(row.updated_at) > cutoff && !["rejected", "expired"].includes(row.review_status)) {
      return {
        ok: false,
        capture_session_id: captureSessionId,
        session_id: row.id,
        dry_run: input?.dryRun ?? false,
        error: "retention_period_not_elapsed",
        error_code: "retention_not_elapsed",
      };
    }
  }

  const { data: docs } = await sb
    .from("passport_documents")
    .select("id, storage_path")
    .eq("capture_session_id", captureSessionId)
    .eq("stamp_id", "identity");

  const storagePaths = (docs ?? [])
    .map(d => d.storage_path as string)
    .filter(p => p && !p.startsWith(PURGED_STORAGE_MARKER));

  if (input?.dryRun) {
    logPurgeEvent({
      event: "purge_dry_run",
      capture_session_id: captureSessionId,
      session_id: row.id,
      dry_run: true,
      storage_objects_removed: storagePaths.length,
      document_rows_redacted: docs?.length ?? 0,
    });
    return {
      ok: true,
      capture_session_id: captureSessionId,
      session_id: row.id,
      dry_run: true,
      storage_objects_removed: storagePaths.length,
      document_rows_redacted: docs?.length ?? 0,
    };
  }

  let storageRemoved = 0;
  const storageFailures: string[] = [];
  for (const path of storagePaths) {
    const removed = await removeStorageObject(sb, path);
    if (removed) storageRemoved += 1;
    else storageFailures.push(path);
  }

  const now = new Date().toISOString();
  const marker = `${PURGED_STORAGE_MARKER}${captureSessionId}`;

  const { error: docErr } = await sb
    .from("passport_documents")
    .update({
      storage_path: marker,
      legal_name: null,
      reviewer_note: null,
      updated_at: now,
    })
    .eq("capture_session_id", captureSessionId)
    .eq("stamp_id", "identity");

  if (docErr) {
    await sb
      .from("identity_review_sessions")
      .update({
        purge_attempt_count: row.purge_attempt_count + 1,
        last_purge_error_code: "document_redact_failed",
        updated_at: now,
      })
      .eq("id", row.id);

    logPurgeEvent({
      event: "purge_failed",
      capture_session_id: captureSessionId,
      session_id: row.id,
      error_code: "document_redact_failed",
    });

    return {
      ok: false,
      capture_session_id: captureSessionId,
      session_id: row.id,
      dry_run: false,
      error: docErr.message,
      error_code: "document_redact_failed",
      storage_objects_removed: storageRemoved,
    };
  }

  if (storageFailures.length > 0) {
    await sb
      .from("identity_review_sessions")
      .update({
        purge_attempt_count: row.purge_attempt_count + 1,
        last_purge_error_code: "storage_partial_failure",
        updated_at: now,
      })
      .eq("id", row.id);

    logPurgeEvent({
      event: "purge_partial",
      capture_session_id: captureSessionId,
      session_id: row.id,
      storage_objects_removed: storageRemoved,
      document_rows_redacted: docs?.length ?? 0,
      error_code: "storage_partial_failure",
    });

    return {
      ok: false,
      capture_session_id: captureSessionId,
      session_id: row.id,
      dry_run: false,
      error: "storage_partial_failure",
      error_code: "storage_partial_failure",
      storage_objects_removed: storageRemoved,
      document_rows_redacted: docs?.length ?? 0,
    };
  }

  await sb
    .from("identity_review_sessions")
    .update({
      raw_evidence_purged_at: now,
      purge_attempt_count: row.purge_attempt_count + 1,
      last_purge_error_code: null,
      updated_at: now,
    })
    .eq("id", row.id);

  logPurgeEvent({
    event: "purge_completed",
    capture_session_id: captureSessionId,
    session_id: row.id,
    storage_objects_removed: storageRemoved,
    document_rows_redacted: docs?.length ?? 0,
  });

  return {
    ok: true,
    capture_session_id: captureSessionId,
    session_id: row.id,
    dry_run: false,
    storage_objects_removed: storageRemoved,
    document_rows_redacted: docs?.length ?? 0,
  };
}

export async function purgeAllEligibleRawEvidence(input?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<{
  ok: boolean;
  results: PurgeRawEvidenceResult[];
  error?: string;
}> {
  const sb = getSupabase();
  if (!sb) return { ok: false, results: [], error: "supabase_not_configured" };

  const eligible = await findPurgeEligibleSessions(sb, { limit: input?.limit });
  if (!eligible.ok) return { ok: false, results: [], error: eligible.error };

  const results: PurgeRawEvidenceResult[] = [];
  for (const session of eligible.sessions) {
    results.push(await purgeRawEvidenceForSession(session.capture_session_id, {
      dryRun: input?.dryRun,
      sb,
    }));
  }

  return { ok: results.every(r => r.ok), results };
}
