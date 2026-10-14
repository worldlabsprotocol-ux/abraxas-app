import "server-only";

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
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
import type { AdminReviewAction, AdminReviewRequest, AdminReviewResult, ReviewerDecision } from "./adminReviewService";
import { resolveReviewerDecision } from "./adminReviewService";
import {
  getPassportDocumentByIdDirect,
  insertReviewAuditLogDirect,
  updateBiometricReviewerDecisionDirect,
  updatePassportDocumentsBySessionDirect,
} from "@/lib/persistence/idvDirectStore";
import { getEvidenceCustodyRecordDirect } from "@/lib/persistence/idvDirectStore";

function documentStatusForAction(action: AdminReviewAction): string {
  if (action === "approve") return "accepted";
  if (action === "reject") return "rejected";
  return "resubmission_requested";
}

function resolveSubjectFromDocument(doc: Record<string, unknown>): string | null {
  const holderSubject = (doc.holder_subject_id as string | null)?.trim();
  if (holderSubject && isChainNeutralHolderSubjectId(holderSubject)) return holderSubject;
  if (doc.sui_address) {
    try {
      return normalizeSuiAddress(String(doc.sui_address));
    } catch {
      return null;
    }
  }
  return null;
}

async function assertRequiredEvidenceForApproval(
  captureSessionId: string | null,
  holderSubjectId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!captureSessionId) {
    return { ok: false, error: "Missing capture session evidence", status: 400 };
  }
  for (const kind of ["id_front", "selfie"] as const) {
    const custody = await getEvidenceCustodyRecordDirect(captureSessionId, kind);
    if (!custody || custody.holder_subject_id !== holderSubjectId) {
      return { ok: false, error: "Required identity evidence custody missing", status: 400 };
    }
  }
  return { ok: true };
}

export async function executeAdminReviewActionSovereign(
  request: AdminReviewRequest,
): Promise<AdminReviewResult> {
  const doc = await getPassportDocumentByIdDirect(request.documentId);
  if (!doc) {
    return { ok: false, error: "Document not found", status: 404 };
  }

  const now = new Date().toISOString();
  const previousStatus = String(doc.status);
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

  const subjectRaw = resolveSubjectFromDocument(doc);
  if (!subjectRaw) {
    return { ok: false, error: "No holder subject linked to this document", status: 400 };
  }
  const subjectKey = normalizeHolderSubjectKey(subjectRaw);

  if (request.action === "approve") {
    const minimumAge = request.minimumAgeGate ?? null;
    if (minimumAge != null && minimumAge >= 21) {
      if (!request.note?.trim()) {
        return { ok: false, error: "Reviewer reason is required for age eligibility approval", status: 400 };
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

    const evidenceOk = await assertRequiredEvidenceForApproval(sessionId, subjectKey);
    if (!evidenceOk.ok) {
      return { ok: false, error: evidenceOk.error, status: evidenceOk.status };
    }

    const sandboxOnly = await resolveReviewPolicySandboxFlag(null, {
      captureSessionId: sessionId,
      suiAddress: subjectKey,
    });

    const linkagePrecheck = await precheckAgeEvidenceLinkage({
      sandboxOnly,
      minimumAgeGate: minimumAge,
    });
    if (!linkagePrecheck.ok) {
      return { ok: false, error: linkagePrecheck.error, status: linkagePrecheck.status };
    }

    const issued = await issueManualIdentityCredential(subjectKey, {
      reviewId: String(doc.id),
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
    if (minimumAge != null && minimumAge >= 21 && request.documentDateOfBirth) {
      const evidence = await createAgeEvidenceRecord({
        subjectSuiAddress: subjectKey,
        passportDocumentId: String(doc.id),
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
        credentialJti: issued.jti ?? null,
      });
      const finalized = finalizeAgeEvidenceLinkage({
        sandboxOnly,
        minimumAgeGate: minimumAge,
        evidence,
      });
      if (!finalized.ok) {
        return { ok: false, error: finalized.error, status: finalized.status };
      }
      ageEvidenceId = finalized.evidenceId;
    }

    if (sessionId) {
      await updatePassportDocumentsBySessionDirect(sessionId, {
        status: newStatus,
        reviewer_note: request.note ?? null,
        reviewed_at: now,
        reviewed_by: request.reviewerId,
      });
    }

    if (sessionId) {
      await updateBiometricReviewerDecisionDirect({
        captureSessionId: sessionId,
        reviewerDecision,
        reviewerId: request.reviewerId,
        reviewedAt: now,
      });
    }

    await insertReviewAuditLogDirect({
      capture_session_id: sessionId,
      passport_document_id: doc.id,
      sui_address: isChainNeutralHolderSubjectId(subjectKey) ? null : normalizeSuiAddress(subjectKey),
      reviewer_id: request.reviewerId,
      action: request.action,
      previous_status: previousStatus,
      new_status: newStatus,
      engine_decision: engineDecision,
      reviewer_decision: reviewerDecision,
      rejection_reasons: null,
      notes: request.note ?? null,
      biometric_engine_version: engineVersion,
    });

    if (sessionId) {
      await updateIdentityReviewSessionStatus(null, sessionId, {
        reviewStatus: "approved",
        eligibilityResult: eligibilityResultFromMinimumAge(minimumAge),
        reviewerId: request.reviewerId,
        reviewerCategory: "admin_allowlisted",
        reasonCode: request.note?.trim() ? "reviewer_approved" : "approved",
      });
    }

    const legacySui = isChainNeutralHolderSubjectId(subjectKey) ? null : normalizeSuiAddress(subjectKey);
    return {
      ok: true,
      action: request.action,
      documentId: String(doc.id),
      captureSessionId: sessionId,
      reviewerDecision,
      engineDecision,
      suiAddress: legacySui ?? subjectKey,
      jti: issued.jti,
      alreadyIssued: issued.alreadyIssued ?? false,
      ageEvidenceId,
    };
  }

  if (sessionId) {
    await updatePassportDocumentsBySessionDirect(sessionId, {
      status: newStatus,
      reviewer_note: request.note ?? null,
      reviewed_at: now,
      reviewed_by: request.reviewerId,
    });
  }

  if (sessionId) {
    await updateBiometricReviewerDecisionDirect({
      captureSessionId: sessionId,
      reviewerDecision,
      reviewerId: request.reviewerId,
      reviewedAt: now,
    });
  }

  if (request.action === "reject") {
    await transitionIdentityVerification(
      subjectKey,
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
      subjectKey,
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

  await insertReviewAuditLogDirect({
    capture_session_id: sessionId,
    passport_document_id: doc.id,
    sui_address: isChainNeutralHolderSubjectId(subjectKey) ? null : normalizeSuiAddress(subjectKey),
    reviewer_id: request.reviewerId,
    action: request.action,
    previous_status: previousStatus,
    new_status: newStatus,
    engine_decision: engineDecision,
    reviewer_decision: reviewerDecision,
    rejection_reasons: rejectionReasons.length ? rejectionReasons : null,
    notes: request.note ?? null,
    biometric_engine_version: engineVersion,
  });

  if (sessionId) {
    await updateIdentityReviewSessionStatus(null, sessionId, {
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
    documentId: String(doc.id),
    captureSessionId: sessionId,
    reviewerDecision,
    engineDecision,
    suiAddress: subjectKey,
  };
}
