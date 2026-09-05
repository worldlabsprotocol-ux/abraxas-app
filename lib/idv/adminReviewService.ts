// FILE: lib/idv/adminReviewService.ts
// Admin identity review actions with immutable audit trail (engine vs reviewer decisions).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getBiometricAssessment } from "./biometric/persistAssessment";
import type { BiometricDecision } from "./biometric/types";
import { issueManualIdentityCredential } from "./issueIdentityCredential";
import { transitionIdentityVerification } from "./identityVerificationDb";
import {
  createAgeEvidenceRecord,
  deriveProviderDecisionFromDob,
} from "@/lib/assurance/ageEvidence";
import {
  finalizeAgeEvidenceLinkage,
  precheckAgeEvidenceLinkage,
  resolveReviewPolicySandboxFlag,
} from "@/lib/assurance/ageEvidenceLinkage";
import {
  eligibilityResultFromMinimumAge,
  updateIdentityReviewSessionStatus,
} from "@/lib/idv/identityReviewSession";
import { evaluateAgeEligibilityFromDocumentDate } from "@/lib/idv/ageEligibility";

export type AdminReviewAction = "approve" | "reject" | "request_resubmission";

export type ReviewerDecision =
  | "approved"
  | "approved_override"
  | "rejected"
  | "resubmission_requested";

export interface AdminReviewRequest {
  documentId: string;
  action: AdminReviewAction;
  reviewerId: string;
  note?: string;
  rejectionReasons?: string[];
  jurisdiction?: string;
  documentType?: string;
  /** Authoritative document DOB (YYYY-MM-DD) — internal reviewer input, never exposed. */
  documentDateOfBirth?: string;
  minimumAgeGate?: number;
}

export interface AdminReviewResult {
  ok: boolean;
  action?: AdminReviewAction;
  documentId?: string;
  captureSessionId?: string | null;
  reviewerDecision?: ReviewerDecision;
  engineDecision?: BiometricDecision | null;
  suiAddress?: string;
  jti?: string;
  alreadyIssued?: boolean;
  ageEvidenceId?: string;
  ageEvidenceStorageUnavailable?: boolean;
  error?: string;
  status?: number;
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function resolveReviewerDecision(
  action: AdminReviewAction,
  engineDecision: BiometricDecision | null,
): ReviewerDecision {
  if (action === "reject") return "rejected";
  if (action === "request_resubmission") return "resubmission_requested";
  if (engineDecision === "reject") return "approved_override";
  return "approved";
}

function documentStatusForAction(action: AdminReviewAction): string {
  if (action === "approve") return "accepted";
  if (action === "reject") return "rejected";
  return "resubmission_requested";
}

async function resolveSuiAddress(
  sb: SupabaseClient,
  doc: { sui_address?: string | null; user_email?: string | null },
): Promise<string | null> {
  if (doc.sui_address) return doc.sui_address;
  if (!doc.user_email) return null;

  const { data: zk } = await sb
    .from("sui_zklogin_identities")
    .select("sui_address")
    .eq("email", doc.user_email)
    .maybeSingle();

  return zk?.sui_address ?? null;
}

async function writeAuditLog(
  sb: SupabaseClient,
  entry: {
    captureSessionId: string | null;
    passportDocumentId: string;
    suiAddress: string | null;
    reviewerId: string;
    action: AdminReviewAction;
    previousStatus: string;
    newStatus: string;
    engineDecision: BiometricDecision | null;
    reviewerDecision: ReviewerDecision;
    rejectionReasons: string[];
    notes: string | null;
    engineVersion: string | null;
  },
): Promise<void> {
  const { error } = await sb.from("identity_review_audit_log").insert({
    capture_session_id: entry.captureSessionId,
    passport_document_id: entry.passportDocumentId,
    sui_address: entry.suiAddress,
    reviewer_id: entry.reviewerId,
    action: entry.action,
    previous_status: entry.previousStatus,
    new_status: entry.newStatus,
    engine_decision: entry.engineDecision,
    reviewer_decision: entry.reviewerDecision,
    rejection_reasons: entry.rejectionReasons.length > 0 ? entry.rejectionReasons : null,
    notes: entry.notes,
    biometric_engine_version: entry.engineVersion,
  });

  if (error) {
    console.error("[adminReview] audit log insert failed:", error.message);
  }
}

async function updateBiometricReviewerDecision(
  sb: SupabaseClient,
  captureSessionId: string | null,
  reviewerDecision: ReviewerDecision,
  reviewerId: string,
  now: string,
): Promise<void> {
  if (!captureSessionId) return;

  const { error } = await sb
    .from("identity_biometric_assessments")
    .update({
      reviewer_decision: reviewerDecision,
      reviewer_id: reviewerId,
      reviewed_at: now,
    })
    .eq("capture_session_id", captureSessionId);

  if (error) {
    console.error("[adminReview] biometric reviewer_decision update failed:", error.message);
  }
}

export async function executeAdminReviewAction(
  request: AdminReviewRequest,
): Promise<AdminReviewResult> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  const { data: doc, error: fetchErr } = await sb
    .from("passport_documents")
    .select("*")
    .eq("id", request.documentId)
    .eq("stamp_id", "identity")
    .maybeSingle();

  if (fetchErr || !doc) {
    return { ok: false, error: "Document not found", status: 404 };
  }

  const now = new Date().toISOString();
  const previousStatus = doc.status as string;
  const sessionId = doc.capture_session_id as string | null;
  const assessment = sessionId ? await getBiometricAssessment(sessionId) : null;
  const engineDecision = assessment?.decision ?? null;
  const engineVersion = assessment?.engine_version ?? null;
  const reviewerDecision = resolveReviewerDecision(request.action, engineDecision);
  const newStatus = documentStatusForAction(request.action);

  const engineReasons = assessment?.reasons ?? [];
  const rejectionReasons = request.action === "reject"
    ? (request.rejectionReasons?.length ? request.rejectionReasons : engineReasons)
    : [];

  const suiRaw = await resolveSuiAddress(sb, doc);

  if (request.action === "approve") {
    if (!suiRaw) {
      return {
        ok: false,
        error: "No Sui address linked — user must sign in before approval",
        status: 400,
      };
    }

    const minimumAge = request.minimumAgeGate ?? null;
    if (minimumAge != null && minimumAge >= 21) {
      if (!request.note?.trim()) {
        return {
          ok: false,
          error: "Reviewer reason is required for age eligibility approval",
          status: 400,
        };
      }
      const eligibility = evaluateAgeEligibilityFromDocumentDate(
        request.documentDateOfBirth,
        minimumAge,
      );
      if (!eligibility.eligible) {
        return {
          ok: false,
          error: `Age eligibility not met: ${eligibility.failureReason ?? "ineligible"}`,
          status: 400,
        };
      }
    }

    const sandboxOnly = await resolveReviewPolicySandboxFlag(sb, {
      captureSessionId: sessionId,
      suiAddress: suiRaw!,
    });

    const linkagePrecheck = await precheckAgeEvidenceLinkage({
      sandboxOnly,
      minimumAgeGate: minimumAge,
    });
    if (!linkagePrecheck.ok) {
      return {
        ok: false,
        error: linkagePrecheck.error,
        status: linkagePrecheck.status,
      };
    }

    const normalized = normalizeSuiAddress(suiRaw);
    const issued = await issueManualIdentityCredential(normalized, {
      reviewId: doc.id as string,
      jurisdiction: request.jurisdiction ?? "US",
      documentType: request.documentType ?? "passport",
      reviewer: request.reviewerId,
      captureSessionId: sessionId ?? undefined,
      assuranceLevel: assessment?.assurance_level ?? "L2",
      reviewMethod: assessment?.review_method ?? "human_biometric_match",
      biometricScores: assessment
        ? { face_match: assessment.scores.face_match, liveness: assessment.scores.liveness }
        : undefined,
      documentDateOfBirth: request.documentDateOfBirth,
      minimumAgeGate: request.minimumAgeGate,
    });

    if (!issued.ok) {
      return { ok: false, error: issued.message ?? "Issuance failed", status: 500 };
    }

    let ageEvidenceId: string | undefined;
    let ageEvidenceStorageUnavailable = false;
    if (minimumAge != null && minimumAge >= 21 && request.documentDateOfBirth) {
      const evidence = await createAgeEvidenceRecord({
        subjectSuiAddress: normalized,
        passportDocumentId: doc.id as string,
        captureSessionId: sessionId,
        evidenceProvider: "abraxas_manual_review",
        evidenceType: "government_id_dob",
        assuranceLevel: assessment?.assurance_level ?? "L2",
        ageThreshold: minimumAge,
        providerDecision: deriveProviderDecisionFromDob(request.documentDateOfBirth, minimumAge),
        reviewStatus: "approved",
        providerReference: `${doc.id}:${sessionId ?? "none"}`,
        reviewerId: request.reviewerId,
        reviewerReason: request.note ?? null,
        reviewedAt: now,
        expiresAt: null,
        credentialJti: issued.jti ?? null,
      });
      const finalized = finalizeAgeEvidenceLinkage({
        sandboxOnly,
        minimumAgeGate: minimumAge,
        evidence,
      });
      if (!finalized.ok) {
        return {
          ok: false,
          error: finalized.error,
          status: finalized.status,
        };
      }
      ageEvidenceId = finalized.evidenceId;
      ageEvidenceStorageUnavailable = finalized.storage_unavailable === true;
    }

    const docUpdate = {
      status: newStatus,
      sui_address: normalized,
      reviewer_note: request.note ?? null,
      reviewed_at: now,
      reviewed_by: request.reviewerId,
      updated_at: now,
    };

    if (sessionId) {
      await sb.from("passport_documents").update(docUpdate).eq("capture_session_id", sessionId);
    } else {
      await sb.from("passport_documents").update(docUpdate).eq("id", doc.id);
    }

    await updateBiometricReviewerDecision(sb, sessionId, reviewerDecision, request.reviewerId, now);

    await writeAuditLog(sb, {
      captureSessionId: sessionId,
      passportDocumentId: doc.id as string,
      suiAddress: normalized,
      reviewerId: request.reviewerId,
      action: request.action,
      previousStatus,
      newStatus,
      engineDecision,
      reviewerDecision,
      rejectionReasons: [],
      notes: request.note ?? null,
      engineVersion,
    });

    if (sessionId) {
      await updateIdentityReviewSessionStatus(sb, sessionId, {
        reviewStatus: "approved",
        eligibilityResult: eligibilityResultFromMinimumAge(minimumAge),
        reviewerId: request.reviewerId,
        reviewerCategory: "admin_allowlisted",
        reasonCode: request.note?.trim() ? "reviewer_approved" : "approved",
      });
    }

    return {
      ok: true,
      action: request.action,
      documentId: doc.id as string,
      captureSessionId: sessionId,
      reviewerDecision,
      engineDecision,
      suiAddress: normalized,
      jti: issued.jti,
      alreadyIssued: issued.alreadyIssued ?? false,
      ageEvidenceId,
      ageEvidenceStorageUnavailable,
    };
  }

  const docUpdate = {
    status: newStatus,
    reviewer_note: request.note ?? null,
    reviewed_at: now,
    reviewed_by: request.reviewerId,
    updated_at: now,
  };

  if (sessionId) {
    await sb.from("passport_documents").update(docUpdate).eq("capture_session_id", sessionId);
  } else {
    await sb.from("passport_documents").update(docUpdate).eq("id", doc.id);
  }

  await updateBiometricReviewerDecision(sb, sessionId, reviewerDecision, request.reviewerId, now);

  if (suiRaw) {
    try {
      const normalized = normalizeSuiAddress(suiRaw);
      if (request.action === "reject") {
        await transitionIdentityVerification(
          normalized,
          {
            user_email: doc.user_email as string,
            status: "revoked",
            identity_verification_status: "declined",
            credential_status: "not_issued",
            error_message: request.note ?? rejectionReasons[0] ?? "Identity verification declined",
          },
          "admin_identity_reject",
        );
      } else {
        await transitionIdentityVerification(
          normalized,
          {
            user_email: doc.user_email as string,
            status: "pending",
            identity_verification_status: "requires_resubmission",
            credential_status: "not_issued",
            error_message: request.note ?? "Please resubmit your identity documents",
          },
          "admin_identity_resubmission",
        );
      }
    } catch (e) {
      console.error("[adminReview] state transition failed:", e);
    }
  }

  await writeAuditLog(sb, {
    captureSessionId: sessionId,
    passportDocumentId: doc.id as string,
    suiAddress: suiRaw ? normalizeSuiAddress(suiRaw) : null,
    reviewerId: request.reviewerId,
    action: request.action,
    previousStatus,
    newStatus,
    engineDecision,
    reviewerDecision,
    rejectionReasons,
    notes: request.note ?? null,
    engineVersion,
  });

  if (sessionId) {
    await updateIdentityReviewSessionStatus(sb, sessionId, {
      reviewStatus: request.action === "reject" ? "rejected" : "expired",
      eligibilityResult: null,
      reviewerId: request.reviewerId,
      reviewerCategory: "admin_allowlisted",
      reasonCode: request.action === "reject" ? "reviewer_rejected" : "resubmission_requested",
    });
  }

  return {
    ok: true,
    action: request.action,
    documentId: doc.id as string,
    captureSessionId: sessionId,
    reviewerDecision,
    engineDecision,
    suiAddress: suiRaw ? normalizeSuiAddress(suiRaw) : undefined,
  };
}
