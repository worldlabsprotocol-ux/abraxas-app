// FILE: lib/idv/biometric/decision.ts

import { getBiometricThresholds, isBiometricAutoApproveEnabled } from "./thresholds";
import type { BiometricDecision, BiometricScores } from "./types";

export interface BiometricDecisionResult {
  decision: BiometricDecision;
  assurance_level: "L2" | "L3";
  review_method: "automated_biometric" | "human_biometric_match";
  reasons: string[];
}

export function evaluateBiometricDecision(scores: BiometricScores): BiometricDecisionResult {
  const t = getBiometricThresholds();
  const reasons: string[] = [];

  if (scores.document_quality < t.documentMin) {
    reasons.push("ID image quality below threshold");
  }
  if (scores.selfie_quality < t.selfieMin) {
    reasons.push("Selfie quality below threshold");
  }
  if (scores.liveness < t.livenessMin) {
    reasons.push("Liveness signals weak");
  }
  if (scores.face_match < t.faceMin) {
    reasons.push("Face match below threshold");
  }

  const hardReject =
    scores.face_match < t.faceMin * 0.55 ||
    scores.document_quality < t.documentMin * 0.5 ||
    scores.selfie_quality < t.selfieMin * 0.5;

  if (hardReject) {
    return {
      decision: "reject",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      reasons,
    };
  }

  const autoEligible =
    isBiometricAutoApproveEnabled() &&
    scores.face_match >= t.autoApproveFace &&
    scores.liveness >= t.autoApproveLiveness &&
    scores.document_quality >= t.documentMin &&
    scores.selfie_quality >= t.selfieMin &&
    reasons.length === 0;

  if (autoEligible) {
    return {
      decision: "auto_approve",
      assurance_level: "L3",
      review_method: "automated_biometric",
      reasons: ["Automated biometric checks passed"],
    };
  }

  return {
    decision: "human_review",
    assurance_level: "L2",
    review_method: "human_biometric_match",
    reasons: reasons.length ? reasons : ["Standard human review queue"],
  };
}
