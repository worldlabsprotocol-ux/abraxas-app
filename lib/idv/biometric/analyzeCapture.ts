// FILE: lib/idv/biometric/analyzeCapture.ts
// Run Abraxas biometric engine on ID + selfie buffers at capture time.

import { compareIdAndSelfie } from "./faceSimilarity";
import { analyzeImageBuffer, livenessFromSelfieSignals } from "./imageSignals";
import { evaluateBiometricDecision } from "./decision";
import type { BiometricAssessment } from "./types";

export const BIOMETRIC_ENGINE_VERSION = "abraxas-biometric-v1";

export async function analyzeBiometricCapture(input: {
  captureSessionId: string;
  suiAddress: string;
  idFrontBuffer: Buffer;
  selfieBuffer: Buffer;
}): Promise<BiometricAssessment> {
  const [idSignals, selfieSignals, faceMatch] = await Promise.all([
    analyzeImageBuffer(input.idFrontBuffer),
    analyzeImageBuffer(input.selfieBuffer),
    compareIdAndSelfie(input.idFrontBuffer, input.selfieBuffer),
  ]);

  const liveness = livenessFromSelfieSignals(selfieSignals);
  const scores = {
    face_match: faceMatch,
    liveness,
    document_quality: idSignals.quality,
    selfie_quality: selfieSignals.quality,
  };

  const decision = evaluateBiometricDecision(scores);

  return {
    capture_session_id: input.captureSessionId,
    sui_address: input.suiAddress,
    scores,
    decision: decision.decision,
    assurance_level: decision.assurance_level,
    review_method: decision.review_method,
    engine_version: BIOMETRIC_ENGINE_VERSION,
    signals: {
      id_width: idSignals.width,
      id_height: idSignals.height,
      id_brightness: idSignals.brightness,
      id_sharpness: idSignals.sharpness,
      selfie_width: selfieSignals.width,
      selfie_height: selfieSignals.height,
      selfie_brightness: selfieSignals.brightness,
      selfie_sharpness: selfieSignals.sharpness,
      selfie_variance: selfieSignals.variance,
    },
    analyzed_at: new Date().toISOString(),
  };
}
