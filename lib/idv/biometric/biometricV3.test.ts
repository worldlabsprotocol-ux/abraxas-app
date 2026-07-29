// FILE: lib/idv/biometric/biometricV3.test.ts

import { describe, expect, it } from "vitest";
import { evaluateBiometricDecision } from "./decision";
import { resolveBiometricThresholds } from "./partnerThresholds";
import { scoreFaceQuality } from "./faceQuality";
import { biometricReason } from "./reasonCodes";

describe("biometric v3 signals", () => {
  it("emits stable reason codes with threshold detail", () => {
    const result = evaluateBiometricDecision(
      { face_match: 0.3, liveness: 0.5, document_quality: 0.6, selfie_quality: 0.55 },
      undefined,
      {
        alignment_score: 0.9,
        selfie_blur_score: 0.9,
        selfie_lighting_score: 0.9,
        selfie_occlusion_score: 0.9,
        screen_replay_score: 0.1,
        deepfake_score: 0,
        deepfake_status: "skipped",
      },
    );
    expect(result.reason_codes).toContain("FACE_MATCH_LOW");
    expect(result.reasons[0]).toMatch(/match=/);
  });

  it("merges partner biometric thresholds from policy rules", () => {
    const t = resolveBiometricThresholds({
      partnerId: "good-trouble-cannabis",
      policyRules: {
        biometric_thresholds: { face_min: 0.55, liveness_min: 0.5 },
      },
    });
    expect(t.policySource).toBe("partner");
    expect(t.faceMin).toBe(0.55);
    expect(t.livenessMin).toBe(0.5);
    expect(t.alignmentMin).toBeGreaterThan(0);
  });

  it("decomposes selfie quality into blur, lighting, occlusion", () => {
    const breakdown = scoreFaceQuality(
      {
        width: 1080,
        height: 1080,
        brightness: 0.48,
        sharpness: 0.72,
        variance: 0.4,
        quality: 0.7,
      },
      {
        score: 0.7,
        skin_ratio: 0.12,
        center_variance: 500,
        edge_density: 0.15,
        face_count_estimate: 1,
      },
    );
    expect(breakdown.blur).toBeGreaterThan(0.5);
    expect(breakdown.lighting).toBeGreaterThan(0.5);
    expect(breakdown.composite).toBeGreaterThan(0);
  });

  it("maps reason codes to human messages", () => {
    const r = biometricReason("SCREEN_REPLAY_SUSPECTED", "score=0.71");
    expect(r.message).toMatch(/screen/i);
    expect(r.detail).toBe("score=0.71");
  });
});
