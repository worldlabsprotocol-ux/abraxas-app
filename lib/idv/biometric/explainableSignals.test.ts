// FILE: lib/idv/biometric/explainableSignals.test.ts

import { describe, expect, it } from "vitest";
import { buildExplainableSignals } from "./explainableSignals";
import type { BiometricAssessment } from "./types";

describe("explainableSignals", () => {
  it("builds machine-readable audit record", () => {
    const assessment: BiometricAssessment = {
      capture_session_id: "s1",
      sui_address: "0xabc",
      scores: { face_match: 0.94, liveness: 0.88, document_quality: 0.91, selfie_quality: 0.87 },
      decision: "human_review",
      assurance_level: "L2",
      review_method: "human_biometric_match",
      engine_version: "abraxas-biometric-v3",
      reasons: ["Face match below threshold"],
      reason_codes: ["FACE_MATCH_LOW"],
      signals: {
        id_face_presence: 0.7,
        selfie_face_presence: 0.75,
        selfie_face_count: 1,
        document_class: "passport",
        document_class_confidence: 0.82,
        document_aspect_score: 0.78,
        tamper_score: 0.05,
        fraud_risk_score: 0.12,
      },
      analyzed_at: new Date().toISOString(),
    };

    const e = buildExplainableSignals(assessment);
    expect(e.face_detected_selfie).toBe(true);
    expect(e.document_type).toBe("passport");
    expect(e.face_match).toBe(0.94);
    expect(e.decision).toBe("human_review");
    expect(e.rejection_reasons).toContain("Face match below threshold");
  });
});
