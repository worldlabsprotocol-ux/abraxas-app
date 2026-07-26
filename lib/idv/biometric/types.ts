// FILE: lib/idv/biometric/types.ts
// Abraxas-owned biometric assessment (face match + liveness signals + decision).

export type BiometricDecision = "auto_approve" | "human_review" | "reject";

export interface BiometricScores {
  face_match: number;
  liveness: number;
  document_quality: number;
  selfie_quality: number;
}

export interface BiometricAssessment {
  capture_session_id: string;
  sui_address: string;
  scores: BiometricScores;
  decision: BiometricDecision;
  assurance_level: "L2" | "L3";
  review_method: "automated_biometric" | "human_biometric_match";
  engine_version: string;
  signals: Record<string, number>;
  analyzed_at: string;
}

export interface BiometricThresholds {
  faceMin: number;
  livenessMin: number;
  documentMin: number;
  selfieMin: number;
  autoApproveFace: number;
  autoApproveLiveness: number;
}
