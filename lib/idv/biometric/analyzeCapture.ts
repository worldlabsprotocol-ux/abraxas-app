// FILE: lib/idv/biometric/analyzeCapture.ts
// Run Abraxas biometric engine on ID + selfie buffers at capture time.

import { compareIdAndSelfie } from "./faceSimilarity";
import { documentQualityScore } from "./documentSignals";
import { classifyIdentityDocument } from "./documentClassifier";
import { detectFacePresence } from "./facePresence";
import { analyzeImageBuffer, livenessFromSelfieSignals } from "./imageSignals";
import { evaluateBiometricDecision } from "./decision";
import type { BiometricAssessment, BiometricFraudSignals } from "./types";

export const BIOMETRIC_ENGINE_VERSION = "abraxas-biometric-v2";

export async function analyzeBiometricCapture(input: {
  captureSessionId: string;
  suiAddress: string;
  idFrontBuffer: Buffer;
  selfieBuffer: Buffer;
}): Promise<BiometricAssessment> {
  const [
    idSignals,
    selfieSignals,
    faceMatch,
    idFace,
    selfieFace,
    docClass,
  ] = await Promise.all([
    analyzeImageBuffer(input.idFrontBuffer),
    analyzeImageBuffer(input.selfieBuffer),
    compareIdAndSelfie(input.idFrontBuffer, input.selfieBuffer),
    detectFacePresence(input.idFrontBuffer),
    detectFacePresence(input.selfieBuffer),
    classifyIdentityDocument(input.idFrontBuffer),
  ]);

  const liveness = livenessFromSelfieSignals(selfieSignals);
  const documentQuality = documentQualityScore(
    idSignals.quality,
    idSignals.width,
    idSignals.height,
  );
  const scores = {
    face_match: faceMatch,
    liveness,
    document_quality: documentQuality,
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
  };

  const decision = evaluateBiometricDecision(scores, fraudSignals);
  fraudSignals.fraud_risk_score = decision.fraud_risk_score;

  return {
    capture_session_id: input.captureSessionId,
    sui_address: input.suiAddress,
    scores,
    decision: decision.decision,
    assurance_level: decision.assurance_level,
    review_method: decision.review_method,
    engine_version: BIOMETRIC_ENGINE_VERSION,
    reasons: decision.reasons,
    signals: {
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
      selfie_width: selfieSignals.width,
      selfie_height: selfieSignals.height,
      selfie_brightness: selfieSignals.brightness,
      selfie_sharpness: selfieSignals.sharpness,
      selfie_variance: selfieSignals.variance,
      fraud_risk_score: decision.fraud_risk_score,
    },
    analyzed_at: new Date().toISOString(),
  };
}
