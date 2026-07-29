// FILE: lib/idv/biometric/decision.ts

import { isBiometricAutoApproveEnabled } from "./thresholds";
import {
  biometricReason,
  reasonCodes,
  reasonMessages,
  type BiometricReason,
} from "./reasonCodes";
import type { ExtendedBiometricThresholds } from "./partnerThresholds";
import { resolveBiometricThresholds } from "./partnerThresholds";
import type { BiometricDecision, BiometricFraudSignals, BiometricScores } from "./types";

export interface BiometricDecisionResult {
  decision: BiometricDecision;
  assurance_level: "L2" | "L3";
  review_method: "automated_biometric" | "human_biometric_match";
  reasons: string[];
  reason_codes: string[];
  structured_reasons: BiometricReason[];
  fraud_risk_score: number;
}

export interface BiometricQualitySignals {
  alignment_score: number;
  selfie_blur_score: number;
  selfie_lighting_score: number;
  selfie_occlusion_score: number;
  screen_replay_score: number;
  deepfake_score: number;
  deepfake_status: string;
}

function computeFraudRisk(
  scores: BiometricScores,
  fraud: BiometricFraudSignals,
  quality: BiometricQualitySignals,
  t: ExtendedBiometricThresholds,
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
    Math.max(0, t.alignmentMin - quality.alignment_score),
    Math.max(0, t.blurMin - quality.selfie_blur_score),
    Math.max(0, t.lightingMin - quality.selfie_lighting_score),
    Math.max(0, t.occlusionMin - quality.selfie_occlusion_score),
    Math.max(0, quality.screen_replay_score - t.screenReplayMax),
    Math.max(0, quality.deepfake_score - t.deepfakeMax),
  ];
  const avgDeficit = deficits.reduce((a, b) => a + b, 0) / deficits.length;
  return Math.min(1, avgDeficit * 2.2);
}

export function evaluateBiometricDecision(
  scores: BiometricScores,
  fraud?: BiometricFraudSignals,
  quality?: BiometricQualitySignals,
  thresholdInput?: Parameters<typeof resolveBiometricThresholds>[0],
): BiometricDecisionResult {
  const t = resolveBiometricThresholds(thresholdInput);
  const structured: BiometricReason[] = [];

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

  const q: BiometricQualitySignals = quality ?? {
    alignment_score: 1,
    selfie_blur_score: 1,
    selfie_lighting_score: 1,
    selfie_occlusion_score: 1,
    screen_replay_score: 0,
    deepfake_score: 0,
    deepfake_status: "skipped",
  };

  const fraudRisk = computeFraudRisk(scores, f, q, t);

  if (f.selfie_face_presence < t.facePresenceMin) {
    structured.push(biometricReason("SELFIE_FACE_MISSING"));
  }
  if (f.selfie_face_count > 1) {
    structured.push(biometricReason("SELFIE_MULTIPLE_FACES"));
  }
  if (f.id_face_presence < t.facePresenceMin * 0.75) {
    structured.push(biometricReason("ID_FACE_MISSING"));
  }
  if (f.document_aspect < t.documentAspectMin) {
    structured.push(biometricReason("DOCUMENT_ASPECT_INVALID"));
  }
  if (f.document_class === "unknown" && f.document_class_confidence < t.documentClassMin) {
    structured.push(biometricReason("DOCUMENT_CLASS_UNKNOWN"));
  }
  if (f.document_edge_density < 0.04 && f.document_aspect < t.documentAspectMin * 1.1) {
    structured.push(biometricReason("DOCUMENT_STRUCTURE_WEAK"));
  }
  if (scores.document_quality < t.documentMin) {
    structured.push(biometricReason("ID_QUALITY_LOW"));
  }
  if (scores.selfie_quality < t.selfieMin) {
    structured.push(
      biometricReason(
        "SELFIE_QUALITY_LOW",
        `blur=${q.selfie_blur_score.toFixed(2)} lighting=${q.selfie_lighting_score.toFixed(2)} occlusion=${q.selfie_occlusion_score.toFixed(2)}`,
      ),
    );
  } else {
    if (q.selfie_blur_score < t.blurMin) {
      structured.push(
        biometricReason("SELFIE_BLUR_HIGH", `blur=${q.selfie_blur_score.toFixed(2)} < ${t.blurMin}`),
      );
    }
    if (q.selfie_lighting_score < t.lightingMin) {
      structured.push(
        biometricReason("SELFIE_LIGHTING_POOR", `lighting=${q.selfie_lighting_score.toFixed(2)}`),
      );
    }
    if (q.selfie_occlusion_score < t.occlusionMin) {
      structured.push(biometricReason("SELFIE_OCCLUSION_SUSPECTED"));
    }
  }
  if (q.alignment_score < t.alignmentMin && scores.selfie_quality < t.selfieMin * 1.05) {
    structured.push(
      biometricReason("SELFIE_ALIGNMENT_POOR", `alignment=${q.alignment_score.toFixed(2)}`),
    );
  }
  if (scores.liveness < t.livenessMin) {
    structured.push(biometricReason("LIVENESS_WEAK"));
  }
  if (scores.face_match < t.faceMin) {
    structured.push(
      biometricReason("FACE_MATCH_LOW", `match=${scores.face_match.toFixed(2)} < ${t.faceMin}`),
    );
  }
  if (q.screen_replay_score > t.screenReplayMax) {
    structured.push(
      biometricReason("SCREEN_REPLAY_SUSPECTED", `score=${q.screen_replay_score.toFixed(2)}`),
    );
  }
  if (f.selfie_tamper_score > 0.65 || f.id_tamper_score > 0.65) {
    structured.push(biometricReason("TAMPER_SUSPECTED"));
  }
  if (q.deepfake_score > t.deepfakeMax && q.deepfake_status === "ok") {
    structured.push(
      biometricReason("DEEPFAKE_SCORE_HIGH", `score=${q.deepfake_score.toFixed(2)}`),
    );
  }
  if (fraudRisk > t.fraudRiskMax) {
    structured.push(
      biometricReason("FRAUD_RISK_HIGH", `score=${fraudRisk.toFixed(2)} > ${t.fraudRiskMax}`),
    );
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
    q.screen_replay_score > Math.min(0.85, t.screenReplayMax + 0.15) ||
    (q.deepfake_score > t.deepfakeMax && q.deepfake_status === "ok") ||
    fraudRisk >= t.fraudRiskMax;

  if (hardReject) {
    const reasons = structured.length ? structured : [biometricReason("GENERIC_REJECT")];
    return {
      decision: "reject",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      reasons: reasonMessages(reasons),
      reason_codes: reasonCodes(reasons),
      structured_reasons: reasons,
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
    q.alignment_score >= t.alignmentMin &&
    q.selfie_blur_score >= t.blurMin &&
    q.selfie_lighting_score >= t.lightingMin &&
    q.selfie_occlusion_score >= t.occlusionMin &&
    q.screen_replay_score <= t.screenReplayMax &&
    (q.deepfake_status !== "ok" || q.deepfake_score <= t.deepfakeMax) &&
    structured.length === 0;

  if (autoEligible) {
    const passed = [biometricReason("AUTO_APPROVE_PASSED")];
    return {
      decision: "auto_approve",
      assurance_level: "L3",
      review_method: "automated_biometric",
      reasons: reasonMessages(passed),
      reason_codes: reasonCodes(passed),
      structured_reasons: passed,
      fraud_risk_score: fraudRisk,
    };
  }

  const borderlineReview =
    structured.length <= 2 &&
    fraudRisk < 0.55 &&
    f.selfie_face_presence >= t.facePresenceMin * 0.7 &&
    f.document_aspect >= t.documentAspectMin * 0.65;

  if (borderlineReview) {
    const reviewReasons = structured.length
      ? structured
      : [biometricReason("BORDERLINE_HUMAN_REVIEW")];
    return {
      decision: "human_review",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      reasons: reasonMessages(reviewReasons),
      reason_codes: reasonCodes(reviewReasons),
      structured_reasons: reviewReasons,
      fraud_risk_score: fraudRisk,
    };
  }

  const rejectReasons = structured.length
    ? structured
    : [biometricReason("FRAUD_RISK_HIGH")];
  return {
    decision: "reject",
    assurance_level: "L2",
    review_method: "human_biometric_match",
    reasons: reasonMessages(rejectReasons),
    reason_codes: reasonCodes(rejectReasons),
    structured_reasons: rejectReasons,
    fraud_risk_score: fraudRisk,
  };
}
