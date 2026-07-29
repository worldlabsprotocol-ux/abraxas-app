// FILE: lib/idv/biometric/analyzeCapture.ts
// Run Abraxas biometric engine on ID + selfie buffers at capture time.

import { compareIdAndSelfie } from "./faceSimilarity";
import { documentQualityScore } from "./documentSignals";
import { classifyIdentityDocument } from "./documentClassifier";
import { detectFacePresence } from "./facePresence";
import { analyzeImageBuffer, livenessFromSelfieSignals } from "./imageSignals";
import { evaluateBiometricDecision } from "./decision";
import { buildExplainableSignals, explainableSignalsToRecord } from "./explainableSignals";
import { analyzeFaceAlignment } from "./faceAlignment";
import { scoreFaceQuality } from "./faceQuality";
import { analyzeScreenReplay } from "./screenReplay";
import { runDeepfakeHook } from "./deepfakeHook";
import { emitBiometricTelemetry } from "./telemetry";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import type { BiometricAssessment, BiometricFraudSignals, BiometricSignals } from "./types";

export const BIOMETRIC_ENGINE_VERSION = "abraxas-biometric-v3";

export async function analyzeBiometricCapture(input: {
  captureSessionId: string;
  suiAddress: string;
  idFrontBuffer: Buffer;
  selfieBuffer: Buffer;
  partnerId?: string;
  policyRules?: PartnerPolicyRules | null;
}): Promise<BiometricAssessment> {
  const started = Date.now();

  const [
    idSignals,
    selfieSignals,
    faceMatchResult,
    idFace,
    selfieFace,
    docClass,
    selfieAlignment,
    idReplay,
    selfieReplay,
    deepfake,
  ] = await Promise.all([
    analyzeImageBuffer(input.idFrontBuffer),
    analyzeImageBuffer(input.selfieBuffer),
    compareIdAndSelfie(input.idFrontBuffer, input.selfieBuffer).then(r => r),
    detectFacePresence(input.idFrontBuffer),
    detectFacePresence(input.selfieBuffer),
    classifyIdentityDocument(input.idFrontBuffer),
    analyzeFaceAlignment(input.selfieBuffer),
    analyzeScreenReplay(input.idFrontBuffer),
    analyzeScreenReplay(input.selfieBuffer),
    runDeepfakeHook(input.selfieBuffer),
  ]);

  const selfieQuality = scoreFaceQuality(selfieSignals, selfieFace);
  const liveness = livenessFromSelfieSignals(selfieSignals);
  const documentQuality = documentQualityScore(
    idSignals.quality,
    idSignals.width,
    idSignals.height,
  );

  const scores = {
    face_match: faceMatchResult.score,
    liveness,
    document_quality: documentQuality,
    // Keep legacy aggregate for threshold compatibility; granular scores live in signals.
    selfie_quality: selfieSignals.quality,
  };

  const fraudSignals: BiometricFraudSignals = {
    id_face_presence: idFace.score,
    selfie_face_presence: selfieFace.score,
    document_aspect: docClass.aspect_score,
    document_class: docClass.document_class,
    document_class_confidence: docClass.confidence,
    document_edge_density: docClass.edge_density,
    fraud_risk_score: 0,
    selfie_face_count: selfieFace.face_count_estimate,
    id_tamper_score: idReplay.digital_tamper_score,
    selfie_tamper_score: selfieReplay.digital_tamper_score,
  };

  const qualitySignals = {
    alignment_score: selfieAlignment.score,
    selfie_blur_score: selfieQuality.blur,
    selfie_lighting_score: selfieQuality.lighting,
    selfie_occlusion_score: selfieQuality.occlusion,
    screen_replay_score: Math.max(idReplay.screen_replay_score, selfieReplay.screen_replay_score),
    deepfake_score: deepfake.score,
    deepfake_status: deepfake.status,
  };

  const decision = evaluateBiometricDecision(
    scores,
    fraudSignals,
    qualitySignals,
    { partnerId: input.partnerId, policyRules: input.policyRules },
  );
  fraudSignals.fraud_risk_score = decision.fraud_risk_score;

  const rawSignals: BiometricSignals = {
    id_width: idSignals.width,
    id_height: idSignals.height,
    id_brightness: idSignals.brightness,
    id_sharpness: idSignals.sharpness,
    document_aspect_score: docClass.aspect_score,
    document_class: docClass.document_class,
    document_class_confidence: docClass.confidence,
    document_edge_density: docClass.edge_density,
    id_face_presence: idFace.score,
    id_face_skin_ratio: idFace.skin_ratio,
    selfie_face_presence: selfieFace.score,
    selfie_face_skin_ratio: selfieFace.skin_ratio,
    selfie_face_count: selfieFace.face_count_estimate,
    selfie_width: selfieSignals.width,
    selfie_height: selfieSignals.height,
    selfie_brightness: selfieSignals.brightness,
    selfie_sharpness: selfieSignals.sharpness,
    selfie_variance: selfieSignals.variance,
    selfie_blur_score: selfieQuality.blur,
    selfie_lighting_score: selfieQuality.lighting,
    selfie_occlusion_score: selfieQuality.occlusion,
    alignment_score: selfieAlignment.score,
    alignment_offset_x: selfieAlignment.center_offset_x,
    alignment_offset_y: selfieAlignment.center_offset_y,
    face_coverage: selfieAlignment.face_coverage,
    symmetry_score: selfieAlignment.symmetry_score,
    tamper_score_id: idReplay.combined_tamper_score,
    tamper_score_selfie: selfieReplay.combined_tamper_score,
    screen_replay_score: qualitySignals.screen_replay_score,
    digital_tamper_score_id: idReplay.digital_tamper_score,
    digital_tamper_score_selfie: selfieReplay.digital_tamper_score,
    tamper_score: Math.max(idReplay.combined_tamper_score, selfieReplay.combined_tamper_score),
    deepfake_score: deepfake.score,
    deepfake_status: deepfake.status,
    deepfake_provider: deepfake.provider,
    fraud_risk_score: decision.fraud_risk_score,
    reason_codes: decision.reason_codes,
    threshold_policy_source: input.policyRules?.biometric_thresholds ? "partner" : "global",
    partner_id: input.partnerId ?? "",
    face_match_method: faceMatchResult.method,
  };

  const draft: BiometricAssessment = {
    capture_session_id: input.captureSessionId,
    sui_address: input.suiAddress,
    scores,
    decision: decision.decision,
    assurance_level: decision.assurance_level,
    review_method: decision.review_method,
    engine_version: BIOMETRIC_ENGINE_VERSION,
    reasons: decision.reasons,
    reason_codes: decision.reason_codes,
    signals: rawSignals,
    analyzed_at: new Date().toISOString(),
  };

  const explainable = buildExplainableSignals(draft);
  draft.signals = {
    ...rawSignals,
    ...explainableSignalsToRecord(explainable),
  };

  emitBiometricTelemetry(draft, {
    latencyMs: Date.now() - started,
    partnerId: input.partnerId,
  });

  return draft;
}
