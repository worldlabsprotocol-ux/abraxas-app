// FILE: lib/idv/biometric/biometricEngine.test.ts

import { describe, expect, it } from "vitest";
import { evaluateBiometricDecision } from "./decision";
import type { BiometricFraudSignals } from "./types";

const GOOD_FRAUD: BiometricFraudSignals = {
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

describe("evaluateBiometricDecision", () => {
  it("auto-approves when scores exceed auto thresholds and flag enabled", () => {
    process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE = "1";
    const result = evaluateBiometricDecision({
      face_match: 0.85,
      liveness: 0.75,
      document_quality: 0.7,
      selfie_quality: 0.72,
    }, GOOD_FRAUD);
    expect(result.decision).toBe("auto_approve");
    expect(result.assurance_level).toBe("L3");
    expect(result.review_method).toBe("automated_biometric");
    delete process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE;
  });

  it("queues human review for borderline legitimate captures", () => {
    delete process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE;
    const result = evaluateBiometricDecision({
      face_match: 0.52,
      liveness: 0.55,
      document_quality: 0.6,
      selfie_quality: 0.58,
    }, GOOD_FRAUD);
    expect(result.decision).toBe("human_review");
    expect(result.assurance_level).toBe("L2");
  });

  it("rejects very low quality captures", () => {
    const result = evaluateBiometricDecision({
      face_match: 0.12,
      liveness: 0.15,
      document_quality: 0.12,
      selfie_quality: 0.1,
    }, {
      ...GOOD_FRAUD,
      id_face_presence: 0.08,
      selfie_face_presence: 0.05,
      document_aspect: 0.1,
      document_class_confidence: 0.1,
      selfie_face_count: 0,
    });
    expect(result.decision).toBe("reject");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("rejects random scenery with no face or document structure", () => {
    const result = evaluateBiometricDecision({
      face_match: 0.35,
      liveness: 0.3,
      document_quality: 0.28,
      selfie_quality: 0.32,
    }, {
      id_face_presence: 0.05,
      selfie_face_presence: 0.04,
      document_aspect: 0.15,
      document_class: "unknown",
      document_class_confidence: 0.12,
      document_edge_density: 0.02,
      fraud_risk_score: 0,
      selfie_face_count: 0,
      id_tamper_score: 0.2,
      selfie_tamper_score: 0.2,
    });
    expect(result.decision).toBe("reject");
    expect(result.reasons.some(r => r.toLowerCase().includes("face"))).toBe(true);
  });

  it("rejects multi-issue fraud instead of queuing for review", () => {
    const result = evaluateBiometricDecision({
      face_match: 0.28,
      liveness: 0.25,
      document_quality: 0.22,
      selfie_quality: 0.2,
    }, {
      id_face_presence: 0.2,
      selfie_face_presence: 0.18,
      document_aspect: 0.22,
      document_class: "unknown",
      document_class_confidence: 0.2,
      document_edge_density: 0.03,
      fraud_risk_score: 0,
      selfie_face_count: 1,
      id_tamper_score: 0.3,
      selfie_tamper_score: 0.3,
    });
    expect(result.decision).toBe("reject");
    expect(result.fraud_risk_score).toBeGreaterThan(0.25);
  });
});
