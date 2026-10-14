import "server-only";

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { getBiometricAssessment } from "./biometric/persistAssessment";
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
import { eligibilityResultFromMinimumAge } from "@/lib/idv/identityReviewSession";
import { evaluateAgeEligibilityFromDocumentDate } from "@/lib/idv/ageEligibility";
import type { AdminReviewAction, AdminReviewRequest, AdminReviewResult } from "./adminReviewService";
import { resolveReviewerDecision } from "./adminReviewService";
import { getPassportDocumentByIdDirect, getEvidenceCustodyRecordDirect } from "@/lib/persistence/idvDirectStore";
import { revokeSubjectClaimsDirect } from "@/lib/persistence/claimsDirectStore";
import {
  commitSovereignReviewOutcomeDirect,
  SovereignReviewConflictError,
  SovereignReviewStateError,
} from "@/lib/persistence/sovereignAdminReviewCommit";

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

async function rollbackIssuedCredential(subjectKey: string, jti: string, reason: string): Promise<void> {
  try {
    await revokeSubjectClaimsDirect(subjectKey, reason, jti);
  } catch {
    // fail-closed: issuance audit remains; operator must reconcile
  }
}

export async function executeAdminReviewActionSovereign(
  request: AdminReviewRequest,
): Promise<AdminReviewResult> {
  const doc = await getPassportDocumentByIdDirect(request.documentId);
  if (!doc) {
    return { ok: false, error: "Document not found", status: 404 };
  }

  const previousStatus = String(doc.status);
  const sessionId = doc.capture_session_id as string | null;
  if (!sessionId) {
    return { ok: false, error: "Capture session required for sovereign review", status: 400 };
  }

  if (previousStatus === "accepted" && request.action === "approve") {
    return {
      ok: true,
      action: request.action,
      documentId: String(doc.id),
      captureSessionId: sessionId,
      alreadyIssued: true,
      reviewerDecision: "approved",
    };
  }
  if (previousStatus === "rejected" && request.action === "reject") {
    return {
      ok: true,
      action: request.action,
      documentId: String(doc.id),
      captureSessionId: sessionId,
      reviewerDecision: "rejected",
    };
  }
  if (!["submitted", "under_review"].includes(previousStatus)) {
    return { ok: false, error: "Review not in pending state", status: 409 };
  }

  const now = new Date().toISOString();
  const assessment = await getBiometricAssessment(sessionId);
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
  const legacySui = isChainNeutralHolderSubjectId(subjectKey) ? null : normalizeSuiAddress(subjectKey);

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
        providerReference: `${doc.id}:${sessionId}`,
        reviewerId: request.reviewerId,
        reviewerReason: request.note ?? null,
        reviewedAt: now,
        credentialJti: null,
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

    const issued = await issueManualIdentityCredential(subjectKey, {
      reviewId: String(doc.id),
      jurisdiction: request.jurisdiction ?? "US",
      documentType: request.documentType ?? "passport",
      reviewer: request.reviewerId,
      captureSessionId: sessionId,
      assuranceLevel: assessment?.assurance_level ?? "L2",
      reviewMethod: assessment?.review_method ?? "human_biometric_match",
      biometricScores: assessment
        ? { face_match: assessment.scores.face_match, liveness: assessment.scores.liveness }
        : undefined,
      documentDateOfBirth: request.documentDateOfBirth,
      minimumAgeGate: request.minimumAgeGate,
    });

    if (!issued.ok || !issued.jti) {
      return { ok: false, error: issued.message ?? "Issuance failed", status: 500 };
    }

    try {
      await commitSovereignReviewOutcomeDirect({
        captureSessionId: sessionId,
        passportDocumentId: String(doc.id),
        holderSubjectId: subjectKey,
        action: request.action,
        reviewerId: request.reviewerId,
        reviewerDecision,
        engineDecision,
        engineVersion,
        previousStatus,
        newStatus,
        note: request.note ?? null,
        rejectionReasons: null,
        sessionPatch: {
          reviewStatus: "approved",
          eligibilityResult: eligibilityResultFromMinimumAge(minimumAge),
          reasonCode: request.note?.trim() ? "reviewer_approved" : "approved",
        },
        suiAddress: legacySui,
      });
    } catch (error) {
      await rollbackIssuedCredential(subjectKey, issued.jti, "admin_review_commit_failed");
      if (error instanceof SovereignReviewStateError && error.message === "review_already_approved") {
        return {
          ok: true,
          action: request.action,
          documentId: String(doc.id),
          captureSessionId: sessionId,
          jti: issued.jti,
          alreadyIssued: true,
          reviewerDecision,
          engineDecision,
          suiAddress: legacySui ?? subjectKey,
          ageEvidenceId,
        };
      }
      if (error instanceof SovereignReviewConflictError || error instanceof SovereignReviewStateError) {
        await rollbackIssuedCredential(subjectKey, issued.jti, "admin_review_conflict");
        return { ok: false, error: error.message, status: 409 };
      }
      return { ok: false, error: "Review persistence failed", status: 500 };
    }

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

  try {
    await commitSovereignReviewOutcomeDirect({
      captureSessionId: sessionId,
      passportDocumentId: String(doc.id),
      holderSubjectId: subjectKey,
      action: request.action,
      reviewerId: request.reviewerId,
      reviewerDecision,
      engineDecision,
      engineVersion,
      previousStatus,
      newStatus,
      note: request.note ?? null,
      rejectionReasons,
      sessionPatch: {
        reviewStatus: request.action === "reject" ? "rejected" : "expired",
        eligibilityResult: null,
        reasonCode: request.action === "reject" ? "reviewer_rejected" : "resubmission_requested",
      },
      suiAddress: legacySui,
    });
  } catch (error) {
    if (error instanceof SovereignReviewStateError) {
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
    if (error instanceof SovereignReviewConflictError) {
      return { ok: false, error: error.message, status: 409 };
    }
    return { ok: false, error: "Review persistence failed", status: 500 };
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
