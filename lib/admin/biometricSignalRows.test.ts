// FILE: lib/admin/biometricSignalRows.test.ts

import { describe, expect, it } from "vitest";
import { buildBiometricSignalRows } from "./biometricSignalRows";

describe("buildBiometricSignalRows", () => {
  it("renders v3 admin panel fields from assessment signals", () => {
    const rows = buildBiometricSignalRows({
      engine_version: "abraxas-biometric-v3",
      decision: "human_review",
      face_match_score: 0.88,
      liveness_score: 0.91,
      signals: {
        threshold_policy_source: "partner",
        partner_id: "good-trouble-cannabis",
        selfie_blur_score: 0.74,
        selfie_lighting_score: 0.81,
        selfie_occlusion_score: 0.79,
        alignment_score: 0.83,
        screen_replay_score: 0.11,
        deepfake_score: 0.02,
        deepfake_status: "skipped",
        reason_codes: ["FACE_MATCH_LOW"],
        face_match_method: "correlation",
      },
    });

    const map = Object.fromEntries(rows);
    expect(map["Threshold source"]).toBe("partner");
    expect(map["Selfie blur"]).toBe("74%");
    expect(map["Selfie lighting"]).toBe("81%");
    expect(map["Screen replay"]).toBe("11%");
    expect(map["Reason codes"]).toBe("FACE_MATCH_LOW");
    expect(map["Face match method"]).toBe("correlation");
  });
});
