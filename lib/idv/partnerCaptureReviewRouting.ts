// FILE: lib/idv/partnerCaptureReviewRouting.ts
// Partner age-gated flows: escalate soft engine rejects to human review queue.

import type { BiometricAssessment } from "@/lib/idv/biometric/types";
import type { CaptureBiometricPolicyContext } from "@/lib/idv/biometric/resolveCapturePolicy";

const HARD_REJECT_REASON_CODES = new Set([
  "SELFIE_MULTIPLE_FACES",
  "SELFIE_FACE_MISSING",
  "ID_FACE_MISSING",
]);

export function partnerRequiresHumanReviewEscalation(
  policyContext: CaptureBiometricPolicyContext,
): boolean {
  if (!policyContext.partnerId) return false;
  const minAge = policyContext.policyRules?.minimum_age;
  return minAge != null && minAge >= 21;
}

export function isHardBiometricReject(assessment: BiometricAssessment): boolean {
  if (assessment.reason_codes.some(code => HARD_REJECT_REASON_CODES.has(code))) {
    return true;
  }
  const faceCount = Number(assessment.signals.selfie_face_count ?? 1);
  if (faceCount > 1) return true;
  const selfiePresence = Number(assessment.signals.selfie_face_presence ?? 1);
  const idPresence = Number(assessment.signals.id_face_presence ?? 1);
  if (selfiePresence < 0.25) return true;
  if (idPresence < 0.2) return true;
  return false;
}

/**
 * Age-gated partner captures: soft engine rejects enter the admin queue instead of 422.
 * Hard rejects (missing face, multiple faces) still block submission.
 */
export function shouldEscalatePartnerRejectToHumanReview(
  assessment: BiometricAssessment,
  policyContext: CaptureBiometricPolicyContext,
): boolean {
  if (assessment.decision !== "reject") return false;
  if (!partnerRequiresHumanReviewEscalation(policyContext)) return false;
  if (isHardBiometricReject(assessment)) return false;
  return true;
}

export function withPartnerHumanReviewEscalation(
  assessment: BiometricAssessment,
  policyContext: CaptureBiometricPolicyContext,
): BiometricAssessment {
  if (!shouldEscalatePartnerRejectToHumanReview(assessment, policyContext)) {
    return assessment;
  }
  return {
    ...assessment,
    decision: "human_review",
    reasons: [
      ...assessment.reasons,
      "Partner age-gated flow: queued for human review despite engine reject.",
    ],
    reason_codes: [...assessment.reason_codes, "PARTNER_HUMAN_REVIEW_ESCALATION"],
  };
}
