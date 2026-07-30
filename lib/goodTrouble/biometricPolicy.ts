// FILE: lib/goodTrouble/biometricPolicy.ts
// Good Trouble capture-time biometric thresholds (mirrors migration 050).

import type { PartnerBiometricThresholdRules } from "@/lib/policy/types";

export const GOOD_TROUBLE_BIOMETRIC_THRESHOLDS: PartnerBiometricThresholdRules = {
  face_min: 0.90,
  liveness_min: 0.92,
  fraud_risk_max: 0.15,
  alignment_min: 0.45,
  blur_min: 0.40,
  lighting_min: 0.38,
  screen_replay_max: 0.45,
  deepfake_max: 0.50,
};

export const GOOD_TROUBLE_RETAIL_MINIMUM_AGE = 21;
