// FILE: lib/idv/biometric/reasonCodes.ts
// Stable machine-readable codes + human explanations for every biometric outcome.

export type BiometricReasonCode =
  | "SELFIE_FACE_MISSING"
  | "SELFIE_MULTIPLE_FACES"
  | "ID_FACE_MISSING"
  | "DOCUMENT_ASPECT_INVALID"
  | "DOCUMENT_CLASS_UNKNOWN"
  | "DOCUMENT_STRUCTURE_WEAK"
  | "ID_QUALITY_LOW"
  | "SELFIE_QUALITY_LOW"
  | "SELFIE_BLUR_HIGH"
  | "SELFIE_LIGHTING_POOR"
  | "SELFIE_OCCLUSION_SUSPECTED"
  | "SELFIE_ALIGNMENT_POOR"
  | "LIVENESS_WEAK"
  | "FACE_MATCH_LOW"
  | "SCREEN_REPLAY_SUSPECTED"
  | "TAMPER_SUSPECTED"
  | "DEEPFAKE_SCORE_HIGH"
  | "FRAUD_RISK_HIGH"
  | "AUTO_APPROVE_PASSED"
  | "BORDERLINE_HUMAN_REVIEW"
  | "GENERIC_REJECT";

export interface BiometricReason {
  code: BiometricReasonCode;
  message: string;
  detail?: string;
}

const MESSAGES: Record<BiometricReasonCode, string> = {
  SELFIE_FACE_MISSING: "Selfie must show a clear human face",
  SELFIE_MULTIPLE_FACES: "Selfie must show exactly one face",
  ID_FACE_MISSING: "Government ID photo must include a visible face",
  DOCUMENT_ASPECT_INVALID: "Image does not look like a government ID or passport",
  DOCUMENT_CLASS_UNKNOWN: "Unsupported or unrecognized document type",
  DOCUMENT_STRUCTURE_WEAK: "ID image lacks document structure (text/edges)",
  ID_QUALITY_LOW: "ID image quality below threshold",
  SELFIE_QUALITY_LOW: "Selfie quality below threshold",
  SELFIE_BLUR_HIGH: "Selfie is too blurry — hold steady and retake",
  SELFIE_LIGHTING_POOR: "Selfie lighting is uneven or too dark",
  SELFIE_OCCLUSION_SUSPECTED: "Face may be partially covered — remove masks or obstructions",
  SELFIE_ALIGNMENT_POOR: "Center your face in the frame and look at the camera",
  LIVENESS_WEAK: "Liveness signals weak — retake selfie with your face centered",
  FACE_MATCH_LOW: "Face on ID does not match selfie",
  SCREEN_REPLAY_SUSPECTED: "Image may be a photo of a screen",
  TAMPER_SUSPECTED: "Image may be digitally altered",
  DEEPFAKE_SCORE_HIGH: "Synthetic face signals detected",
  FRAUD_RISK_HIGH: "Submission did not pass fraud detection thresholds",
  AUTO_APPROVE_PASSED: "Automated biometric checks passed",
  BORDERLINE_HUMAN_REVIEW: "Borderline scores — human review required",
  GENERIC_REJECT: "Submission failed automated fraud checks",
};

export function biometricReason(
  code: BiometricReasonCode,
  detail?: string,
): BiometricReason {
  return { code, message: MESSAGES[code], detail };
}

export function reasonMessages(reasons: BiometricReason[]): string[] {
  return reasons.map((r) => (r.detail ? `${r.message} (${r.detail})` : r.message));
}

export function reasonCodes(reasons: BiometricReason[]): BiometricReasonCode[] {
  return reasons.map((r) => r.code);
}
