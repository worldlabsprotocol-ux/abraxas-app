// FILE: app/api/identity/documents/capture/route.ts
// Abraxas-native identity capture: legal name + ID front + selfie + biometric engine.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { randomUUID } from "crypto";
import { transitionIdentityVerification } from "@/lib/idv/identityVerificationDb";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getIdvProvider } from "@/lib/idv/idvProvider";
import { analyzeBiometricCapture } from "@/lib/idv/biometric/analyzeCapture";
import { checkCaptureRateLimit, logCaptureAudit } from "@/lib/idv/biometric/captureGuard";
import { resolveCaptureBiometricPolicy } from "@/lib/idv/biometric/resolveCapturePolicy";
import { persistBiometricAssessment } from "@/lib/idv/biometric/persistAssessment";
import { buildOpaqueCaptureStoragePath, opaqueStoragePathHasNoPii } from "@/lib/idv/passportDocumentStoragePath";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function uploadCaptureBuffer(
  supabase: SupabaseClient,
  buffer: Buffer,
  contentType: string,
  sessionId: string,
  documentType: "id_front" | "selfie",
) {
  const path = buildOpaqueCaptureStoragePath({
    captureSessionId: sessionId,
    documentType,
    contentType,
  });

  if (!opaqueStoragePathHasNoPii(path)) {
    throw new Error("opaque_storage_path_validation_failed");
  }

  const { error: uploadError } = await supabase.storage
    .from("passport-documents")
    .upload(path, buffer, { contentType: contentType || "image/jpeg", upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const ext = contentType.includes("png") ? "png" : "jpg";
  return { path, fileName: `${documentType}.${ext}` };
}

function validateImageFile(file: File, label: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Invalid file type for ${label}. Use JPG or PNG.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large for ${label}. Max 8 MB.`);
  }
}

async function hasPendingIdentityReview(
  supabase: SupabaseClient,
  suiAddress: string,
): Promise<boolean> {
  const normalized = normalizeSuiAddress(suiAddress);

  const { count: docCount } = await supabase
    .from("passport_documents")
    .select("id", { count: "exact", head: true })
    .eq("sui_address", normalized)
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"]);

  if ((docCount ?? 0) > 0) return true;

  const { data: idv } = await supabase
    .from("identity_verifications")
    .select("identity_verification_status, credential_status, status")
    .or(`wallet_address.eq.${normalized},sui_address.eq.${normalized}`)
    .maybeSingle();

  if (!idv) return false;

  return (
    idv.identity_verification_status === "submitted"
    || idv.identity_verification_status === "in_progress"
    || (idv.status === "pending" && idv.credential_status !== "active")
  );
}

export async function POST(req: NextRequest) {
  try {
    if (getIdvProvider() === "veriff") {
      return NextResponse.json({
        error: "Abraxas Verify is disabled while legacy automated IDV is active.",
      }, { status: 403 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Document storage not configured" }, { status: 503 });
    }

    const auth = await requireBrowserSession(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const legalName = (formData.get("legal_name") as string | null)?.trim();
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

    const suiAddress = normalizeSuiAddress(auth.session.suiAddress);

    const rateLimit = await checkCaptureRateLimit(supabase, suiAddress);
    if (!rateLimit.allowed) {
      logCaptureAudit({
        event: "capture_rate_limited",
        sui_address: suiAddress,
        reason: `${rateLimit.attemptsInWindow}/${rateLimit.limit} per hour`,
      });
      return NextResponse.json({
        error: "Too many capture attempts. Please wait before trying again.",
        retry_after_sec: rateLimit.retryAfterSec,
      }, { status: 429 });
    }

    if (await hasPendingIdentityReview(supabase, suiAddress)) {
      return NextResponse.json({
        error: "Identity verification is already pending review. We'll notify you when it's complete.",
        already_pending: true,
      }, { status: 409 });
    }

    const { data: zkRow } = await supabase
      .from("sui_zklogin_identities")
      .select("email")
      .eq("sui_address", suiAddress)
      .maybeSingle();

    const email = zkRow?.email?.trim();
    if (!email?.includes("@")) {
      return NextResponse.json({
        error: "Google account email required — sign in again from the top right",
      }, { status: 403 });
    }

    const idBuffer = Buffer.from(await idFront.arrayBuffer());
    const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
    const captureSessionId = randomUUID();

    logCaptureAudit({
      event: "capture_started",
      sui_address: suiAddress,
      capture_session_id: captureSessionId,
    });

    const policyContext = await resolveCaptureBiometricPolicy(supabase, {
      policyId: formData.get("policy_id") as string | null,
      partnerId: formData.get("partner_id") as string | null,
      verificationRequestId: formData.get("verification_request_id") as string | null,
    });

    const assessment = await analyzeBiometricCapture({
      captureSessionId,
      suiAddress,
      idFrontBuffer: idBuffer,
      selfieBuffer,
      partnerId: policyContext.partnerId,
      policyRules: policyContext.policyRules,
    });

    await persistBiometricAssessment(assessment);

    if (assessment.decision === "reject") {
      logCaptureAudit({
        event: "capture_rejected_engine",
        sui_address: suiAddress,
        capture_session_id: captureSessionId,
        decision: assessment.decision,
        engine_version: assessment.engine_version,
        scores: {
          face_match: assessment.scores.face_match,
          liveness: assessment.scores.liveness,
        },
      });
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

    const [idUpload, selfieUpload] = await Promise.all([
      uploadCaptureBuffer(supabase, idBuffer, idFront.type, captureSessionId, "id_front"),
      uploadCaptureBuffer(supabase, selfieBuffer, selfie.type, captureSessionId, "selfie"),
    ]);

    const rows = [
      {
        user_email: email,
        sui_address: suiAddress,
        stamp_id: "identity",
        file_name: idUpload.fileName,
        storage_path: idUpload.path,
        status: "submitted",
        document_type: "id_front",
        capture_session_id: captureSessionId,
        legal_name: legalName,
      },
      {
        user_email: email,
        sui_address: suiAddress,
        stamp_id: "identity",
        file_name: selfieUpload.fileName,
        storage_path: selfieUpload.path,
        status: "submitted",
        document_type: "selfie",
        capture_session_id: captureSessionId,
        legal_name: legalName,
      },
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("passport_documents")
      .insert(rows)
      .select("id, document_type");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const reviewDocId = inserted?.find(r => r.document_type === "id_front")?.id;

    if (assessment.decision === "auto_approve" && reviewDocId) {
      const issued = await issueManualIdentityCredential(suiAddress, {
        reviewId: reviewDocId,
        captureSessionId,
        reviewer: "abraxas_biometric_engine",
        assuranceLevel: assessment.assurance_level,
        reviewMethod: assessment.review_method,
        biometricScores: {
          face_match: assessment.scores.face_match,
          liveness: assessment.scores.liveness,
        },
      });

      if (issued.ok) {
        logCaptureAudit({
          event: "capture_auto_approved",
          sui_address: suiAddress,
          capture_session_id: captureSessionId,
          decision: "auto_approve",
          engine_version: assessment.engine_version,
        });
        await supabase
          .from("passport_documents")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("capture_session_id", captureSessionId);

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

    logCaptureAudit({
      event: "capture_queued_review",
      sui_address: suiAddress,
      capture_session_id: captureSessionId,
      decision: assessment.decision,
      engine_version: assessment.engine_version,
      scores: {
        face_match: assessment.scores.face_match,
        liveness: assessment.scores.liveness,
      },
    });

    await transitionIdentityVerification(
      suiAddress,
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
      document_ids: inserted?.map(r => r.id) ?? [],
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
