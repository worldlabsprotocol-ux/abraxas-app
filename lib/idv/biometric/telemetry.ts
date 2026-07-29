// FILE: lib/idv/biometric/telemetry.ts
// Structured biometric capture telemetry (stdout JSON; APM-ready).

import type { BiometricAssessment } from "./types";

export interface BiometricTelemetryEvent {
  event: "biometric.analyzed";
  capture_session_id: string;
  sui_address: string;
  partner_id?: string;
  engine_version: string;
  decision: string;
  assurance_level: string;
  fraud_risk_score: number;
  latency_ms: number;
  scores: {
    face_match: number;
    liveness: number;
    document_quality: number;
    selfie_quality: number;
  };
  signals: {
    alignment: number;
    blur: number;
    lighting: number;
    occlusion: number;
    screen_replay: number;
    deepfake: number;
    face_count: number;
  };
  reason_codes: string[];
}

export function emitBiometricTelemetry(
  assessment: BiometricAssessment,
  meta: { latencyMs: number; partnerId?: string },
): void {
  const s = assessment.signals;
  const payload: BiometricTelemetryEvent = {
    event: "biometric.analyzed",
    capture_session_id: assessment.capture_session_id,
    sui_address: assessment.sui_address,
    partner_id: meta.partnerId,
    engine_version: assessment.engine_version,
    decision: assessment.decision,
    assurance_level: assessment.assurance_level,
    fraud_risk_score: Number(s.fraud_risk_score ?? 0),
    latency_ms: meta.latencyMs,
    scores: { ...assessment.scores },
    signals: {
      alignment: Number(s.alignment_score ?? 0),
      blur: Number(s.selfie_blur_score ?? 0),
      lighting: Number(s.selfie_lighting_score ?? 0),
      occlusion: Number(s.selfie_occlusion_score ?? 0),
      screen_replay: Number(s.screen_replay_score ?? 0),
      deepfake: Number(s.deepfake_score ?? 0),
      face_count: Number(s.selfie_face_count ?? 0),
    },
    reason_codes: Array.isArray(s.reason_codes)
      ? (s.reason_codes as string[])
      : [],
  };

  console.log(JSON.stringify(payload));
}
