// FILE: lib/goodTrouble/biometricPolicy.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BIOMETRIC_THRESHOLDS,
  GOOD_TROUBLE_RETAIL_MINIMUM_AGE,
} from "./biometricPolicy";
import { resolveBiometricThresholds } from "@/lib/idv/biometric/partnerThresholds";
import { evaluateBiometricDecision } from "@/lib/idv/biometric/decision";

describe("Good Trouble biometric policy", () => {
  it("matches migration 050 retail thresholds", () => {
    expect(GOOD_TROUBLE_BIOMETRIC_THRESHOLDS.face_min).toBe(0.90);
    expect(GOOD_TROUBLE_BIOMETRIC_THRESHOLDS.liveness_min).toBe(0.92);
    expect(GOOD_TROUBLE_BIOMETRIC_THRESHOLDS.fraud_risk_max).toBe(0.15);
    expect(GOOD_TROUBLE_RETAIL_MINIMUM_AGE).toBe(21);
  });

  it("resolves partner thresholds from policy rules", () => {
    const t = resolveBiometricThresholds({
      partnerId: "good-trouble-cannabis",
      policyRules: { biometric_thresholds: GOOD_TROUBLE_BIOMETRIC_THRESHOLDS },
    });
    expect(t.policySource).toBe("partner");
    expect(t.faceMin).toBe(0.90);
    expect(t.livenessMin).toBe(0.92);
    expect(t.fraudRiskMax).toBe(0.15);
  });

  it("produces a stricter decision than global for the same borderline capture", () => {
    const scores = {
      face_match: 0.88,
      liveness: 0.93,
      document_quality: 0.72,
      selfie_quality: 0.7,
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
    const fraud = {
      id_face_presence: 0.65,
      selfie_face_presence: 0.7,
      document_aspect: 0.72,
      document_class: "passport",
      document_class_confidence: 0.68,
      document_edge_density: 0.12,
      fraud_risk_score: 0,
      selfie_face_count: 1,
      id_tamper_score: 0.1,
      selfie_tamper_score: 0.1,
    };

    const global = evaluateBiometricDecision(scores, fraud, quality);
    const goodTrouble = evaluateBiometricDecision(scores, fraud, quality, {
      partnerId: "good-trouble-cannabis",
      policyRules: { biometric_thresholds: GOOD_TROUBLE_BIOMETRIC_THRESHOLDS },
    });

    expect(global.reason_codes).not.toContain("FACE_MATCH_LOW");
    expect(goodTrouble.reason_codes).toContain("FACE_MATCH_LOW");
  });
});
