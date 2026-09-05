// FILE: lib/assurance/ageEvidence.ts
// Provider-neutral age-evidence records — minimum data, no raw ID documents.

import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { evaluateAgeEligibilityFromDocumentDate } from "@/lib/idv/ageEligibility";
import {
  AGE_EVIDENCE_TABLE,
  isMissingRelationError,
  type EvidenceStorageAvailability,
} from "./evidenceStorage";

export type AgeEvidenceProvider =
  | "abraxas_biometric"
  | "abraxas_manual_review"
  | "veriff"
  | "sandbox_pilot";

export type AgeEvidenceType = "government_id_dob" | "idv_vendor_age";

export type AgeEvidenceReviewStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "superseded";

export type AgeProviderDecision = "eligible" | "ineligible" | "pending";

export interface AgeEvidenceRecord {
  id: string;
  subject_sui_address: string;
  passport_document_id: string | null;
  capture_session_id: string | null;
  evidence_provider: AgeEvidenceProvider;
  evidence_type: AgeEvidenceType;
  assurance_level: string;
  age_threshold: number;
  provider_decision: AgeProviderDecision;
  review_status: AgeEvidenceReviewStatus;
  provider_reference_hash: string | null;
  reviewer_id: string | null;
  reviewer_reason: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  credential_jti: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAgeEvidenceInput {
  subjectSuiAddress: string;
  passportDocumentId?: string | null;
  captureSessionId?: string | null;
  evidenceProvider: AgeEvidenceProvider;
  evidenceType: AgeEvidenceType;
  assuranceLevel: string;
  ageThreshold: number;
  providerDecision: AgeProviderDecision;
  reviewStatus: AgeEvidenceReviewStatus;
  providerReference?: string | null;
  reviewerId?: string | null;
  reviewerReason?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  credentialJti?: string | null;
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Hash a provider reference for safe storage — never store raw DOB or document IDs. */
export function hashProviderReference(reference: string): string {
  return createHash("sha256").update(reference).digest("hex");
}

export function deriveProviderDecisionFromDob(
  documentDateOfBirth: string | null | undefined,
  minimumAge: number,
): AgeProviderDecision {
  const eligibility = evaluateAgeEligibilityFromDocumentDate(documentDateOfBirth, minimumAge);
  if (eligibility.eligible) return "eligible";
  if (eligibility.failureReason === "missing") return "pending";
  return "ineligible";
}

export async function checkAgeEvidenceStorageAvailability(): Promise<EvidenceStorageAvailability> {
  const sb = getSupabase();
  if (!sb) return { available: false, reason: "not_configured" };

  const { error } = await sb.from(AGE_EVIDENCE_TABLE).select("id").limit(0);
  if (!error) return { available: true };
  if (isMissingRelationError(error.message)) {
    return { available: false, reason: "table_missing" };
  }
  return { available: true };
}

export type AgeEvidenceRecordResult =
  | { ok: true; id: string }
  | { ok: false; error: string; storage_unavailable?: boolean };

export async function createAgeEvidenceRecord(
  input: CreateAgeEvidenceInput,
): Promise<AgeEvidenceRecordResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured", storage_unavailable: true };

  const availability = await checkAgeEvidenceStorageAvailability();
  if (!availability.available) {
    return {
      ok: false,
      error: availability.reason === "table_missing"
        ? "age_evidence_storage_unavailable"
        : "Supabase not configured",
      storage_unavailable: true,
    };
  }

  const subject = normalizeSuiAddress(input.subjectSuiAddress);
  const now = new Date().toISOString();
  const providerReferenceHash = input.providerReference
    ? hashProviderReference(input.providerReference)
    : null;

  const { data, error } = await sb
    .from("age_evidence_records")
    .insert({
      subject_sui_address: subject,
      passport_document_id: input.passportDocumentId ?? null,
      capture_session_id: input.captureSessionId ?? null,
      evidence_provider: input.evidenceProvider,
      evidence_type: input.evidenceType,
      assurance_level: input.assuranceLevel,
      age_threshold: input.ageThreshold,
      provider_decision: input.providerDecision,
      review_status: input.reviewStatus,
      provider_reference_hash: providerReferenceHash,
      reviewer_id: input.reviewerId ?? null,
      reviewer_reason: input.reviewerReason ?? null,
      reviewed_at: input.reviewedAt ?? null,
      expires_at: input.expiresAt ?? null,
      credential_jti: input.credentialJti ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (isMissingRelationError(error?.message)) {
      return { ok: false, error: "age_evidence_storage_unavailable", storage_unavailable: true };
    }
    return { ok: false, error: error?.message ?? "insert failed" };
  }

  return { ok: true, id: data.id as string };
}

export async function getActiveAgeEvidenceForSubject(
  subjectSuiAddress: string,
  ageThreshold: number,
): Promise<AgeEvidenceRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const subject = normalizeSuiAddress(subjectSuiAddress);
  const now = new Date().toISOString();

  const { data } = await sb
    .from("age_evidence_records")
    .select("*")
    .eq("subject_sui_address", subject)
    .eq("age_threshold", ageThreshold)
    .eq("review_status", "approved")
    .eq("provider_decision", "eligible")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as AgeEvidenceRecord | null;
}

export async function supersedePendingAgeEvidence(
  subjectSuiAddress: string,
  captureSessionId: string | null,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const subject = normalizeSuiAddress(subjectSuiAddress);
  const now = new Date().toISOString();

  let query = sb
    .from("age_evidence_records")
    .update({ review_status: "superseded", updated_at: now })
    .eq("subject_sui_address", subject)
    .eq("review_status", "pending");

  if (captureSessionId) {
    query = query.eq("capture_session_id", captureSessionId);
  }

  await query;
}

export function isAgeEvidenceApprovable(
  record: Pick<AgeEvidenceRecord, "review_status" | "provider_decision" | "expires_at"> | null,
): boolean {
  if (!record) return false;
  if (record.review_status !== "pending" && record.review_status !== "approved") return false;
  if (record.provider_decision !== "eligible" && record.provider_decision !== "pending") return false;
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) return false;
  return true;
}
