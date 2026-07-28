// FILE: lib/idv/biometric/identityPipeline.test.ts
// End-to-end pipeline logic: provider → engine decision → review queue (no auto-approve in prod).

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { evaluateBiometricDecision } from "./decision";
import { isBiometricAutoApproveEnabled } from "./thresholds";
import { getIdvProvider, isAbraxasIndependentIdv } from "@/lib/idv/idvProvider";

const HIGH_SCORES = {
  face_match: 0.9,
  liveness: 0.85,
  document_quality: 0.8,
  selfie_quality: 0.78,
};

describe("Abraxas Verify identity pipeline", () => {
  const env = { ...process.env };

  beforeEach(() => {
    delete process.env.IDV_PROVIDER;
    delete process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to Abraxas Verify (manual) without Veriff API key", () => {
    process.env.VERIFF_API_KEY = "live-key-should-not-matter";
    expect(getIdvProvider()).toBe("manual");
    expect(isAbraxasIndependentIdv()).toBe(true);
  });

  it("keeps auto-approve disabled by default — high scores queue for human review", () => {
    expect(isBiometricAutoApproveEnabled()).toBe(false);
    const result = evaluateBiometricDecision(HIGH_SCORES, {
      id_face_presence: 0.7,
      selfie_face_presence: 0.75,
      document_aspect: 0.8,
      document_class: "passport",
      document_class_confidence: 0.75,
      document_edge_density: 0.1,
      fraud_risk_score: 0,
    });
    expect(result.decision).toBe("human_review");
    expect(result.assurance_level).toBe("L2");
    expect(result.review_method).toBe("human_biometric_match");
  });

  it("auto-approves only when explicitly enabled", () => {
    process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE = "1";
    const result = evaluateBiometricDecision(HIGH_SCORES, {
      id_face_presence: 0.7,
      selfie_face_presence: 0.75,
      document_aspect: 0.8,
      document_class: "passport",
      document_class_confidence: 0.75,
      document_edge_density: 0.1,
      fraud_risk_score: 0,
    });
    expect(result.decision).toBe("auto_approve");
    expect(result.assurance_level).toBe("L3");
  });

  it("rejects very low quality captures before human review", () => {
    const result = evaluateBiometricDecision({
      face_match: 0.1,
      liveness: 0.15,
      document_quality: 0.12,
      selfie_quality: 0.1,
    });
    expect(result.decision).toBe("reject");
  });

  it("documents full pipeline stages for ops", () => {
    const stages = [
      "passport_ui",
      "id_upload",
      "selfie",
      "biometric_engine",
      "admin_review",
      "credential_issuance",
      "on_chain_passport",
    ];
    expect(stages).toHaveLength(7);
  });
});
