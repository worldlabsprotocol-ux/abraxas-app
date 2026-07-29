// FILE: lib/idv/biometric/explainableSignals.ts
// Machine-readable audit trail for every biometric assessment.

import type { BiometricAssessment, BiometricDecision, BiometricSignals } from "./types";

export interface ExplainableBiometricSignals {
  face_detected_id: boolean;
  face_detected_selfie: boolean;
  face_count_selfie: number;
  face_match: number;
  liveness: number;
  document_type: string;
  document_confidence: number;
  document_aspect_score: number;
  image_quality_id: number;
  image_quality_selfie: number;
  selfie_blur_score: number;
  selfie_lighting_score: number;
  selfie_occlusion_score: number;
  alignment_score: number;
  face_coverage: number;
  screen_replay_score: number;
  tamper_score: number;
  deepfake_score: number;
  deepfake_status: string;
  fraud_risk: number;
  decision: BiometricDecision;
  rejection_reasons: string[];
  reason_codes: string[];
  engine_version: string;
}

export function buildExplainableSignals(assessment: BiometricAssessment): ExplainableBiometricSignals {
  const s = assessment.signals;
  const idFace = Number(s.id_face_presence ?? 0);
  const selfieFace = Number(s.selfie_face_presence ?? 0);
  const faceCount = Number(s.selfie_face_count ?? 1);

  return {
    face_detected_id: idFace >= 0.32,
    face_detected_selfie: selfieFace >= 0.32,
    face_count_selfie: faceCount,
    face_match: round4(assessment.scores.face_match),
    liveness: round4(assessment.scores.liveness),
    document_type: String(s.document_class ?? "unknown"),
    document_confidence: round4(Number(s.document_class_confidence ?? 0)),
    document_aspect_score: round4(Number(s.document_aspect_score ?? 0)),
    image_quality_id: round4(assessment.scores.document_quality),
    image_quality_selfie: round4(assessment.scores.selfie_quality),
    selfie_blur_score: round4(Number(s.selfie_blur_score ?? 0)),
    selfie_lighting_score: round4(Number(s.selfie_lighting_score ?? 0)),
    selfie_occlusion_score: round4(Number(s.selfie_occlusion_score ?? 0)),
    alignment_score: round4(Number(s.alignment_score ?? 0)),
    face_coverage: round4(Number(s.face_coverage ?? 0)),
    screen_replay_score: round4(Number(s.screen_replay_score ?? 0)),
    tamper_score: round4(Number(s.tamper_score ?? 0)),
    deepfake_score: round4(Number(s.deepfake_score ?? 0)),
    deepfake_status: String(s.deepfake_status ?? "skipped"),
    fraud_risk: round4(Number(s.fraud_risk_score ?? 0)),
    decision: assessment.decision,
    rejection_reasons: assessment.reasons,
    reason_codes: assessment.reason_codes,
    engine_version: assessment.engine_version,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Flat map for Supabase JSONB storage + admin UI. */
export function explainableSignalsToRecord(
  explainable: ExplainableBiometricSignals,
): BiometricSignals {
  return { ...explainable };
}
