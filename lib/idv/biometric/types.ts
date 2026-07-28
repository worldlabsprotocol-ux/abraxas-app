// FILE: lib/idv/biometric/types.ts
// Abraxas-owned biometric assessment (face match + liveness signals + decision).

export type BiometricDecision = "auto_approve" | "human_review" | "reject";

export interface BiometricScores {
  face_match: number;
  liveness: number;
  document_quality: number;
  selfie_quality: number;
}

export interface BiometricFraudSignals {
  id_face_presence: number;
  selfie_face_presence: number;
  document_aspect: number;
  document_class: string;
  document_class_confidence: number;
  document_edge_density: number;
  fraud_risk_score: number;
  selfie_face_count: number;
  id_tamper_score: number;
  selfie_tamper_score: number;
}

export interface BiometricAssessment {
  capture_session_id: string;
  sui_address: string;
  scores: BiometricScores;
  decision: BiometricDecision;
  assurance_level: "L2" | "L3";
  review_method: "automated_biometric" | "human_biometric_match";
  engine_version: string;
  signals: Record<string, number | string>;
  reasons: string[];
  analyzed_at: string;
}

export interface BiometricThresholds {
  faceMin: number;
  livenessMin: number;
  documentMin: number;
  selfieMin: number;
  autoApproveFace: number;
  autoApproveLiveness: number;
  facePresenceMin: number;
  documentAspectMin: number;
  documentClassMin: number;
}
