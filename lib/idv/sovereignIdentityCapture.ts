import "server-only";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { transitionIdentityVerification } from "@/lib/idv/identityVerificationDb";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { requireChainNeutralIdvDocumentSchema } from "@/lib/persistence/chainNeutralSchemaReady";
import {
  assertSessionOwnsRequestedSubject,
  HolderSubjectResolutionError,
  idvDocumentSubjectColumns,
  requireIdentityProcessingConsent,
  resolveCaptureContactEmail,
  resolveHolderSubjectFromBrowserSession,
} from "@/lib/idv/holderSubjectIdv";
import { validatePassportDocumentSubjectAnchor } from "@/lib/idv/holderSubjectAnchorSql";
import { getIdvProvider } from "@/lib/idv/idvProvider";
import { analyzeBiometricCapture } from "@/lib/idv/biometric/analyzeCapture";
import { checkCaptureRateLimit, logCaptureAudit } from "@/lib/idv/biometric/captureGuard";
import { resolveCaptureBiometricPolicy } from "@/lib/idv/biometric/resolveCapturePolicy";
import { persistBiometricAssessment } from "@/lib/idv/biometric/persistAssessment";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import {
  createAgeEvidenceRecord,
  deriveProviderDecisionFromDob,
} from "@/lib/assurance/ageEvidence";
import {
  finalizeAgeEvidenceLinkage,
  precheckAgeEvidenceLinkage,
} from "@/lib/assurance/ageEvidenceLinkage";
import { withPartnerHumanReviewEscalation } from "@/lib/idv/partnerCaptureReviewRouting";
import {
  createIdentityReviewSession,
  findActivePendingReviewSession,
  hashEvidenceBuffers,
} from "@/lib/idv/identityReviewSession";
import {
  DOCUMENT_CAPTURE_PERSISTENCE_FAILED,
  DOCUMENT_METADATA_PERSISTENCE_FAILED,
  logDocumentApiError,
} from "@/lib/idv/documentApiPublicErrors";
import { storeHolderEvidenceWithCustody } from "@/lib/idv/sovereignEvidenceStorage";
import {
  countPendingIdentityDocumentsDirect,
  insertPassportDocumentDirect,
  recordIdvConsentDirect,
  updatePassportDocumentsBySessionDirect,
} from "@/lib/persistence/idvDirectStore";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;
const CONSENT_VERSION = process.env.ABRAXAS_IDV_CONSENT_VERSION?.trim() || "sovereign-v1";

function validateImageFile(file: File, label: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Invalid file type for ${label}. Use JPG or PNG.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large for ${label}. Max 8 MB.`);
  }
}

async function hasPendingIdentityReviewSovereign(
  holderSubjectKey: string,
  partnerId?: string | null,
  verificationRequestId?: string | null,
): Promise<boolean> {
  const pendingSession = await findActivePendingReviewSession(null, {
    suiAddress: holderSubjectKey,
    partnerId,
    verificationRequestId,
  });
  if (pendingSession) return true;
  const docCount = await countPendingIdentityDocumentsDirect(holderSubjectKey);
  return docCount > 0;
}

export async function handleSovereignIdentityCapture(req: NextRequest): Promise<NextResponse> {
  try {
    if (getIdvProvider() === "veriff") {
      return NextResponse.json({
        error: "Abraxas Verify is disabled while legacy automated IDV is active.",
      }, { status: 403 });
    }

    const auth = await requireBrowserSession(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    try {
      assertSessionOwnsRequestedSubject(
        auth.session,
        (formData.get("holder_subject_id") as string | null)
          ?? (formData.get("sui_address") as string | null),
      );
    } catch (e) {
      if (e instanceof HolderSubjectResolutionError && e.code === "subject_substitution") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw e;
    }

    if (!requireIdentityProcessingConsent(formData)) {
      return NextResponse.json({
        error: "Explicit identity processing consent is required",
        error_code: "consent_required",
      }, { status: 400 });
    }

    const legalName = (formData.get("legal_name") as string | null)?.trim();
    const documentDateOfBirth = (formData.get("document_date_of_birth") as string | null)?.trim() || undefined;
    const idFront = formData.get("id_front") as File | null;
    const selfie = formData.get("selfie") as File | null;

    if (!legalName || !idFront || !selfie) {
      return NextResponse.json({
        error: "legal_name, id_front, and selfie are required",
      }, { status: 400 });
    }

    if (legalName.length < 2) {
      return NextResponse.json({ error: "legal_name must be at least 2 characters" }, { status: 400 });
    }

    validateImageFile(idFront, "ID");
    validateImageFile(selfie, "selfie");

    let holderSubjectKey: string;
    try {
      holderSubjectKey = resolveHolderSubjectFromBrowserSession(auth.session);
    } catch (e) {
      if (e instanceof HolderSubjectResolutionError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    if (isChainNeutralHolderSubjectId(holderSubjectKey)) {
      const schema = await requireChainNeutralIdvDocumentSchema();
      if (!schema.ok) {
        return NextResponse.json(
          { error: "Chain-neutral identity document storage is not available", error_code: schema.code },
          { status: schema.httpStatus },
        );
      }
    }

    const subjectColumns = idvDocumentSubjectColumns(holderSubjectKey);
    const docAnchorValidation = validatePassportDocumentSubjectAnchor(subjectColumns);
    if (!docAnchorValidation.ok) {
      return NextResponse.json(
        { error: "Invalid holder identity reference", error_code: docAnchorValidation.code },
        { status: 400 },
      );
    }

    const rateLimit = await checkCaptureRateLimit(null, holderSubjectKey);
    if (rateLimit.unavailable) {
      return NextResponse.json({
        error: "Identity capture is temporarily unavailable. Please try again shortly.",
        error_code: "capture_rate_limit_unavailable",
        retryable: true,
        retry_after_sec: rateLimit.retryAfterSec ?? 120,
      }, { status: 503 });
    }
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: "Too many capture attempts. Please wait before trying again.",
        retry_after_sec: rateLimit.retryAfterSec,
      }, { status: 429 });
    }

    const email = resolveCaptureContactEmail({
      session: auth.session,
      zkLoginEmail: null,
      contactEmailField: formData.get("contact_email") as string | null,
    });

    if (!email?.includes("@")) {
      return NextResponse.json({
        error: isChainNeutralHolderSubjectId(holderSubjectKey)
          ? "contact_email is required for wallet sign-in holders"
          : "Google account email required — sign in again from the top right",
        error_code: "contact_email_required",
      }, { status: 403 });
    }

    await recordIdvConsentDirect({
      holderSubjectId: holderSubjectKey,
      consentVersion: CONSENT_VERSION,
      consentScope: "identity_processing",
    });

    const idBuffer = Buffer.from(await idFront.arrayBuffer());
    const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
    const captureSessionId = randomUUID();

    const policyContext = await resolveCaptureBiometricPolicy(null, {
      policyId: formData.get("policy_id") as string | null,
      partnerId: formData.get("partner_id") as string | null,
      verificationRequestId: formData.get("verification_request_id") as string | null,
    });

    const verificationRequestId = (formData.get("verification_request_id") as string | null)?.trim() || null;

    if (await hasPendingIdentityReviewSovereign(holderSubjectKey, policyContext.partnerId, verificationRequestId)) {
      return NextResponse.json({
        error: "Identity verification is already pending review. We'll notify you when it's complete.",
        already_pending: true,
      }, { status: 409 });
    }

    const rawAssessment = await analyzeBiometricCapture({
      captureSessionId,
      suiAddress: holderSubjectKey,
      idFrontBuffer: idBuffer,
      selfieBuffer,
      partnerId: policyContext.partnerId,
      policyRules: policyContext.policyRules,
    });
    const assessment = withPartnerHumanReviewEscalation(rawAssessment, policyContext);

    const persistedBio = await persistBiometricAssessment(assessment);
    if (!persistedBio.ok) {
      return NextResponse.json({
        error: DOCUMENT_CAPTURE_PERSISTENCE_FAILED,
        retryable: true,
      }, { status: 503 });
    }

    if (assessment.decision === "reject") {
      return NextResponse.json({
        error: assessment.reasons[0]
          ?? "We couldn't verify your photos. Retake with good lighting, a clear ID image, and your face centered in the selfie.",
        reasons: assessment.reasons,
        reason_codes: assessment.reason_codes,
        biometric: {
          decision: assessment.decision,
          scores: assessment.scores,
          fraud_risk_score: assessment.signals.fraud_risk_score,
          engine_version: assessment.engine_version,
          threshold_policy_source: assessment.signals.threshold_policy_source,
        },
      }, { status: 422 });
    }

    const idStored = await storeHolderEvidenceWithCustody({
      holderSubjectId: holderSubjectKey,
      captureSessionId,
      artifactKind: "id_front",
      plaintext: idBuffer,
    });
    const selfieStored = await storeHolderEvidenceWithCustody({
      holderSubjectId: holderSubjectKey,
      captureSessionId,
      artifactKind: "selfie",
      plaintext: selfieBuffer,
    });

    const sessionResult = await createIdentityReviewSession({
      captureSessionId,
      suiAddress: holderSubjectKey,
      partnerId: policyContext.partnerId,
      policyId: policyContext.policyId,
      verificationRequestId,
      engineDecision: assessment.decision,
      evidenceContentHash: hashEvidenceBuffers(idBuffer, selfieBuffer),
    });

    if (!sessionResult.ok) {
      if (sessionResult.duplicate) {
        return NextResponse.json({
          error: "Identity verification is already pending review for this partner flow.",
          already_pending: true,
        }, { status: 409 });
      }
      logDocumentApiError("identity/documents/capture", sessionResult.error, { stage: "review_session" });
      return NextResponse.json({
        error: DOCUMENT_CAPTURE_PERSISTENCE_FAILED,
        retryable: true,
      }, { status: 500 });
    }

    const idDoc = await insertPassportDocumentDirect({
      user_email: email,
      sui_address: subjectColumns.sui_address,
      holder_subject_id: subjectColumns.holder_subject_id,
      stamp_id: "identity",
      file_name: "id_front.jpg",
      storage_path: idStored.storagePath,
      status: "under_review",
      document_type: "id_front",
      capture_session_id: captureSessionId,
      legal_name: legalName,
    });
    await insertPassportDocumentDirect({
      user_email: email,
      sui_address: subjectColumns.sui_address,
      holder_subject_id: subjectColumns.holder_subject_id,
      stamp_id: "identity",
      file_name: "selfie.jpg",
      storage_path: selfieStored.storagePath,
      status: "under_review",
      document_type: "selfie",
      capture_session_id: captureSessionId,
      legal_name: legalName,
    });

    const reviewDocId = idDoc.id;

    if (assessment.decision === "auto_approve" && reviewDocId) {
      const minimumAge = policyContext.policyRules?.minimum_age;
      const sandboxOnly = policyContext.policyRules?.sandbox_only === true;

      const linkagePrecheck = await precheckAgeEvidenceLinkage({
        sandboxOnly,
        minimumAgeGate: minimumAge,
      });
      if (!linkagePrecheck.ok) {
        return NextResponse.json({
          error: linkagePrecheck.error,
          review_unavailable: true,
        }, { status: linkagePrecheck.status });
      }

      const issued = await issueManualIdentityCredential(holderSubjectKey, {
        reviewId: reviewDocId,
        captureSessionId,
        reviewer: "abraxas_biometric_engine",
        assuranceLevel: assessment.assurance_level,
        reviewMethod: assessment.review_method,
        biometricScores: {
          face_match: assessment.scores.face_match,
          liveness: assessment.scores.liveness,
        },
        documentDateOfBirth,
        minimumAgeGate: policyContext.policyRules?.minimum_age,
      });

      if (issued.ok) {
        if (minimumAge != null && minimumAge >= 21 && documentDateOfBirth) {
          const evidence = await createAgeEvidenceRecord({
            subjectSuiAddress: holderSubjectKey,
            passportDocumentId: reviewDocId,
            captureSessionId,
            evidenceProvider: "abraxas_biometric",
            evidenceType: "government_id_dob",
            assuranceLevel: assessment.assurance_level,
            ageThreshold: minimumAge,
            providerDecision: deriveProviderDecisionFromDob(documentDateOfBirth, minimumAge),
            reviewStatus: "approved",
            providerReference: captureSessionId,
            reviewerId: "abraxas_biometric_engine",
            reviewerReason: "auto_approve",
            reviewedAt: new Date().toISOString(),
            credentialJti: issued.jti ?? null,
          });
          const finalized = finalizeAgeEvidenceLinkage({
            sandboxOnly,
            minimumAgeGate: minimumAge,
            evidence,
          });
          if (!finalized.ok) {
            return NextResponse.json({ error: finalized.error }, { status: finalized.status });
          }
        }

        await updatePassportDocumentsBySessionDirect(captureSessionId, { status: "accepted" });

        return NextResponse.json({
          submitted: true,
          approved: true,
          capture_session_id: captureSessionId,
          review_status: "approved",
          assurance_level: assessment.assurance_level,
          biometric: {
            decision: assessment.decision,
            scores: assessment.scores,
            engine_version: assessment.engine_version,
          },
          jti: issued.jti,
          on_chain: issued.on_chain ?? null,
        });
      }
    }

    const queuedMinimumAge = policyContext.policyRules?.minimum_age;
    if (queuedMinimumAge != null && queuedMinimumAge >= 21) {
      await createAgeEvidenceRecord({
        subjectSuiAddress: holderSubjectKey,
        captureSessionId,
        evidenceProvider: "abraxas_biometric",
        evidenceType: "government_id_dob",
        assuranceLevel: assessment.assurance_level,
        ageThreshold: queuedMinimumAge,
        providerDecision: deriveProviderDecisionFromDob(documentDateOfBirth, queuedMinimumAge),
        reviewStatus: "pending",
        providerReference: captureSessionId,
      });
    }

    await transitionIdentityVerification(
      holderSubjectKey,
      {
        user_email: email,
        status: "pending",
        identity_verification_status: "submitted",
        credential_status: "not_issued",
        liveness_provider: "abraxas_capture",
        document_type: "passport",
        error_message: null,
      },
      "abraxas_identity_capture",
    );

    return NextResponse.json({
      submitted: true,
      capture_session_id: captureSessionId,
      document_ids: [idDoc.id],
      review_status: "submitted",
      biometric: {
        decision: assessment.decision,
        scores: assessment.scores,
        engine_version: assessment.engine_version,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logCaptureAudit({ event: "capture_error", reason: msg });
    if (msg.includes("ABRAXAS_EVIDENCE_STORAGE_ROOT")) {
      return NextResponse.json({ error: "Document storage not configured", error_code: "evidence_storage_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
