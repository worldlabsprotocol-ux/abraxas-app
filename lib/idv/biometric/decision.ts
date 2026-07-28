// FILE: lib/idv/biometric/decision.ts

import { getBiometricThresholds, isBiometricAutoApproveEnabled } from "./thresholds";
import type { BiometricDecision, BiometricFraudSignals, BiometricScores } from "./types";

export interface BiometricDecisionResult {
  decision: BiometricDecision;
  assurance_level: "L2" | "L3";
  review_method: "automated_biometric" | "human_biometric_match";
  reasons: string[];
  fraud_risk_score: number;
}

function computeFraudRisk(
  scores: BiometricScores,
  fraud: BiometricFraudSignals,
  t: ReturnType<typeof getBiometricThresholds>,
): number {
  const deficits = [
    Math.max(0, t.faceMin - scores.face_match),
    Math.max(0, t.livenessMin - scores.liveness),
    Math.max(0, t.documentMin - scores.document_quality),
    Math.max(0, t.selfieMin - scores.selfie_quality),
    Math.max(0, t.facePresenceMin - fraud.selfie_face_presence),
    Math.max(0, t.facePresenceMin * 0.85 - fraud.id_face_presence),
    Math.max(0, t.documentAspectMin - fraud.document_aspect),
    Math.max(0, t.documentClassMin - fraud.document_class_confidence),
  ];
  const avgDeficit = deficits.reduce((a, b) => a + b, 0) / deficits.length;
  return Math.min(1, avgDeficit * 2.2);
}

export function evaluateBiometricDecision(
  scores: BiometricScores,
  fraud?: BiometricFraudSignals,
): BiometricDecisionResult {
  const t = getBiometricThresholds();
  const reasons: string[] = [];

  const f: BiometricFraudSignals = fraud ?? {
    id_face_presence: 1,
    selfie_face_presence: 1,
    document_aspect: 1,
    document_class: "unknown",
    document_class_confidence: 1,
    document_edge_density: 1,
    fraud_risk_score: 0,
    selfie_face_count: 1,
    id_tamper_score: 0,
    selfie_tamper_score: 0,
  };

  const fraudRisk = computeFraudRisk(scores, f, t);

  if (f.selfie_face_presence < t.facePresenceMin) {
    reasons.push("Selfie must show a clear human face");
  }
  if (f.selfie_face_count > 1) {
    reasons.push("Selfie must show exactly one face");
  }
  if (f.id_face_presence < t.facePresenceMin * 0.75) {
    reasons.push("Government ID photo must include a visible face");
  }
  if (f.document_aspect < t.documentAspectMin) {
    reasons.push("Image does not look like a government ID or passport");
  }
  if (f.document_class === "unknown" && f.document_class_confidence < t.documentClassMin) {
    reasons.push("Unsupported or unrecognized document type");
  }
  if (f.document_edge_density < 0.04 && f.document_aspect < t.documentAspectMin * 1.1) {
    reasons.push("ID image lacks document structure (text/edges)");
  }
  if (scores.document_quality < t.documentMin) {
    reasons.push("ID image quality below threshold");
  }
  if (scores.selfie_quality < t.selfieMin) {
    reasons.push("Selfie quality below threshold");
  }
  if (scores.liveness < t.livenessMin) {
    reasons.push("Liveness signals weak — retake selfie with your face centered");
  }
  if (scores.face_match < t.faceMin) {
    reasons.push("Face on ID does not match selfie");
  }
  if (f.selfie_tamper_score > 0.65 || f.id_tamper_score > 0.65) {
    reasons.push("Image may be a screen capture or digitally altered");
  }

  const hardReject =
    f.selfie_face_count > 1 ||
    f.selfie_face_presence < t.facePresenceMin * 0.55 ||
    f.id_face_presence < t.facePresenceMin * 0.45 ||
    f.document_aspect < t.documentAspectMin * 0.55 ||
    (f.document_class === "unknown" && f.document_class_confidence < t.documentClassMin * 0.6) ||
    scores.face_match < t.faceMin * 0.55 ||
    scores.document_quality < t.documentMin * 0.5 ||
    scores.selfie_quality < t.selfieMin * 0.5 ||
    scores.liveness < t.livenessMin * 0.5 ||
    fraudRisk >= 0.72;

  if (hardReject) {
    return {
      decision: "reject",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      reasons: reasons.length ? reasons : ["Submission failed automated fraud checks"],
      fraud_risk_score: fraudRisk,
    };
  }

  const autoEligible =
    isBiometricAutoApproveEnabled() &&
    scores.face_match >= t.autoApproveFace &&
    scores.liveness >= t.autoApproveLiveness &&
    scores.document_quality >= t.documentMin &&
    scores.selfie_quality >= t.selfieMin &&
    f.selfie_face_presence >= t.facePresenceMin &&
    f.id_face_presence >= t.facePresenceMin * 0.75 &&
    f.document_aspect >= t.documentAspectMin &&
    reasons.length === 0;

  if (autoEligible) {
    return {
      decision: "auto_approve",
      assurance_level: "L3",
      review_method: "automated_biometric",
      reasons: ["Automated biometric checks passed"],
      fraud_risk_score: fraudRisk,
    };
  }

  const borderlineReview =
    reasons.length <= 2 &&
    fraudRisk < 0.55 &&
    f.selfie_face_presence >= t.facePresenceMin * 0.7 &&
    f.document_aspect >= t.documentAspectMin * 0.65;

  if (borderlineReview) {
    return {
      decision: "human_review",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      reasons: reasons.length ? reasons : ["Borderline scores — human review required"],
      fraud_risk_score: fraudRisk,
    };
  }

  return {
    decision: "reject",
    assurance_level: "L2",
    review_method: "human_biometric_match",
    reasons: reasons.length ? reasons : ["Submission did not pass fraud detection thresholds"],
    fraud_risk_score: fraudRisk,
  };
}
