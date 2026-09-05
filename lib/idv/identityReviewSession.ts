// FILE: lib/idv/identityReviewSession.ts
// Partner-scoped identity review session records (non-PII queue context).

import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { BiometricDecision } from "@/lib/idv/biometric/types";
import { resolveRawEvidenceRetentionDays } from "@/lib/idv/rawEvidenceRetention";

export type IdentityReviewSessionStatus = "pending" | "approved" | "rejected" | "expired";

export interface IdentityReviewSessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  capture_session_id: string;
  sui_address: string;
  partner_id: string | null;
  policy_id: string | null;
  verification_request_id: string | null;
  review_status: IdentityReviewSessionStatus;
  engine_decision: string | null;
  eligibility_result: string | null;
  raw_evidence_purged_at: string | null;
  raw_evidence_retained_until: string | null;
  evidence_content_hash: string | null;
  purge_attempt_count: number;
  last_purge_error_code: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_category: string | null;
  reason_code: string | null;
}

export interface CreateIdentityReviewSessionInput {
  captureSessionId: string;
  suiAddress: string;
  partnerId?: string | null;
  policyId?: string | null;
  verificationRequestId?: string | null;
  engineDecision?: BiometricDecision | null;
  evidenceContentHash?: string | null;
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hashEvidenceBuffers(idBuffer: Buffer, selfieBuffer: Buffer): string {
  return createHash("sha256")
    .update(idBuffer)
    .update(selfieBuffer)
    .digest("hex");
}

function computeRetainedUntil(): string | null {
  const retention = resolveRawEvidenceRetentionDays();
  if (!retention.ok) return null;
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + retention.retentionDays);
  return until.toISOString();
}

export async function findActivePendingReviewSession(
  sb: SupabaseClient,
  input: {
    suiAddress: string;
    partnerId?: string | null;
    verificationRequestId?: string | null;
  },
): Promise<IdentityReviewSessionRow | null> {
  const normalized = normalizeSuiAddress(input.suiAddress);
  let query = sb
    .from("identity_review_sessions")
    .select("*")
    .eq("sui_address", normalized)
    .eq("review_status", "pending");

  if (input.verificationRequestId) {
    query = query.eq("verification_request_id", input.verificationRequestId);
  } else if (input.partnerId) {
    query = query.eq("partner_id", input.partnerId);
  }

  const { data } = await query.maybeSingle();
  return (data as IdentityReviewSessionRow | null) ?? null;
}

export async function createIdentityReviewSession(
  input: CreateIdentityReviewSessionInput,
  sb?: SupabaseClient,
): Promise<{ ok: true; session: IdentityReviewSessionRow } | { ok: false; error: string; duplicate?: boolean }> {
  const client = sb ?? getSupabase();
  if (!client) return { ok: false, error: "supabase_not_configured" };

  const existing = await findActivePendingReviewSession(client, {
    suiAddress: input.suiAddress,
    partnerId: input.partnerId,
    verificationRequestId: input.verificationRequestId,
  });
  if (existing) {
    return { ok: false, error: "duplicate_pending_review", duplicate: true };
  }

  const now = new Date().toISOString();
  const row = {
    capture_session_id: input.captureSessionId,
    sui_address: normalizeSuiAddress(input.suiAddress),
    partner_id: input.partnerId ?? null,
    policy_id: input.policyId ?? null,
    verification_request_id: input.verificationRequestId ?? null,
    review_status: "pending" as const,
    engine_decision: input.engineDecision ?? null,
    evidence_content_hash: input.evidenceContentHash ?? null,
    raw_evidence_retained_until: computeRetainedUntil(),
    updated_at: now,
  };

  const { data, error } = await client
    .from("identity_review_sessions")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "duplicate_pending_review", duplicate: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, session: data as IdentityReviewSessionRow };
}

export async function updateIdentityReviewSessionStatus(
  sb: SupabaseClient,
  captureSessionId: string,
  input: {
    reviewStatus: IdentityReviewSessionStatus;
    eligibilityResult?: string | null;
    reviewerId?: string | null;
    reviewerCategory?: string | null;
    reasonCode?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await sb
    .from("identity_review_sessions")
    .update({
      review_status: input.reviewStatus,
      eligibility_result: input.eligibilityResult ?? null,
      reviewed_at: now,
      reviewer_id: input.reviewerId ?? null,
      reviewer_category: input.reviewerCategory ?? null,
      reason_code: input.reasonCode ?? null,
      updated_at: now,
    })
    .eq("capture_session_id", captureSessionId);
}

export async function getIdentityReviewSessionByCaptureId(
  sb: SupabaseClient,
  captureSessionId: string,
): Promise<IdentityReviewSessionRow | null> {
  const { data } = await sb
    .from("identity_review_sessions")
    .select("*")
    .eq("capture_session_id", captureSessionId)
    .maybeSingle();
  return (data as IdentityReviewSessionRow | null) ?? null;
}

export async function listIdentityReviewSessions(
  sb: SupabaseClient,
  input: {
    reviewStatus?: IdentityReviewSessionStatus | "pending_group";
    partnerId?: string | null;
    limit?: number;
  },
): Promise<IdentityReviewSessionRow[]> {
  let query = sb
    .from("identity_review_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 200);

  if (input.reviewStatus === "pending_group") {
    query = query.eq("review_status", "pending");
  } else if (input.reviewStatus) {
    query = query.eq("review_status", input.reviewStatus);
  }

  if (input.partnerId) {
    query = query.eq("partner_id", input.partnerId);
  }

  const { data } = await query;
  return (data ?? []) as IdentityReviewSessionRow[];
}

export function mapPassportStatusToSessionStatus(
  passportStatus: string,
): IdentityReviewSessionStatus | null {
  if (passportStatus === "accepted") return "approved";
  if (passportStatus === "rejected") return "rejected";
  if (passportStatus === "submitted" || passportStatus === "under_review") return "pending";
  return null;
}

export function eligibilityResultFromMinimumAge(minimumAge: number | null | undefined): string | null {
  if (minimumAge == null) return null;
  if (minimumAge >= 21) return "over_21";
  if (minimumAge >= 18) return "over_18";
  return `over_${minimumAge}`;
}
