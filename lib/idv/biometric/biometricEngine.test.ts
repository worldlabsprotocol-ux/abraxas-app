// FILE: lib/idv/biometric/biometricEngine.test.ts

import { describe, expect, it } from "vitest";
import { evaluateBiometricDecision } from "./decision";

describe("evaluateBiometricDecision", () => {
  it("auto-approves when scores exceed auto thresholds and flag enabled", () => {
    process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE = "1";
    const result = evaluateBiometricDecision({
      face_match: 0.85,
      liveness: 0.75,
      document_quality: 0.7,
      selfie_quality: 0.72,
    });
    expect(result.decision).toBe("auto_approve");
    expect(result.assurance_level).toBe("L3");
    expect(result.review_method).toBe("automated_biometric");
    delete process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE;
  });

  it("queues human review for mid-range face match", () => {
    delete process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE;
    const result = evaluateBiometricDecision({
      face_match: 0.52,
      liveness: 0.55,
      document_quality: 0.6,
      selfie_quality: 0.58,
    });
    expect(result.decision).toBe("human_review");
    expect(result.assurance_level).toBe("L2");
  });

  it("rejects very low face match", () => {
    const result = evaluateBiometricDecision({
      face_match: 0.12,
      liveness: 0.2,
      document_quality: 0.15,
      selfie_quality: 0.1,
    });
    expect(result.decision).toBe("reject");
  });
});
