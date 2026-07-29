// FILE: lib/goodTrouble/biometricPolicy.test.ts

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_BIOMETRIC_THRESHOLDS,
  GOOD_TROUBLE_RETAIL_MINIMUM_AGE,
} from "./biometricPolicy";
import { resolveBiometricThresholds } from "@/lib/idv/biometric/partnerThresholds";

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
});
