// FILE: scripts/validate-good-trouble-policy.ts
// Phase 3 evidence: Good Trouble vs global policy outcomes.

import { evaluateBiometricDecision } from "../lib/idv/biometric/decision";
import { GOOD_TROUBLE_BIOMETRIC_THRESHOLDS } from "../lib/goodTrouble/biometricPolicy";

const fraud = {
  id_face_presence: 0.7,
  selfie_face_presence: 0.75,
  document_aspect: 0.8,
  document_class: "passport",
  document_class_confidence: 0.75,
  document_edge_density: 0.1,
  fraud_risk_score: 0,
  selfie_face_count: 1,
  id_tamper_score: 0.1,
  selfie_tamper_score: 0.1,
};

const quality = {
  alignment_score: 0.82,
  selfie_blur_score: 0.78,
  selfie_lighting_score: 0.8,
  selfie_occlusion_score: 0.76,
  screen_replay_score: 0.12,
  deepfake_score: 0,
  deepfake_status: "skipped",
};

const gtOpts = {
  partnerId: "good-trouble-cannabis",
  policyRules: { biometric_thresholds: GOOD_TROUBLE_BIOMETRIC_THRESHOLDS },
};

const scenarios = [
  {
    name: "above_thresholds",
    scores: { face_match: 0.95, liveness: 0.95, document_quality: 0.85, selfie_quality: 0.85 },
  },
  {
    name: "borderline",
    scores: { face_match: 0.88, liveness: 0.93, document_quality: 0.72, selfie_quality: 0.7 },
  },
  {
    name: "below_thresholds",
    scores: { face_match: 0.55, liveness: 0.6, document_quality: 0.5, selfie_quality: 0.45 },
  },
] as const;

for (const s of scenarios) {
  const global = evaluateBiometricDecision(s.scores, fraud, quality);
  const partner = evaluateBiometricDecision(s.scores, fraud, quality, gtOpts);
  console.log(JSON.stringify({
    scenario: s.name,
    scores: s.scores,
    global: { decision: global.decision, reason_codes: global.reason_codes },
    good_trouble: { decision: partner.decision, reason_codes: partner.reason_codes },
    policy_changes_outcome: global.decision !== partner.decision || JSON.stringify(global.reason_codes) !== JSON.stringify(partner.reason_codes),
  }));
}
