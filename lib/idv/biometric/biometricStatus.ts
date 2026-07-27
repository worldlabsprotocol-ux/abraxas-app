// FILE: lib/idv/biometric/biometricStatus.ts
// Runtime health for the Abraxas Verify biometric engine.

import { BIOMETRIC_ENGINE_VERSION } from "./analyzeCapture";
import {
  BIOMETRIC_ASSESSMENT_RETENTION_DAYS,
  BIOMETRIC_DOCUMENT_RETENTION_DAYS,
  getCaptureRateLimitPerHour,
} from "./captureGuard";
import { getBiometricThresholds, isBiometricAutoApproveEnabled } from "./thresholds";

export type BiometricEngineStatus = "live" | "partial" | "not_configured";

export interface BiometricEngineHealth {
  engine: typeof BIOMETRIC_ENGINE_VERSION;
  status: BiometricEngineStatus;
  label: string;
  summary: string;
  auto_approve_enabled: boolean;
  production_policy: string;
  rate_limit_per_hour: number;
  retention: {
    document_images_days: number;
    assessment_scores_days: number;
  };
  thresholds: ReturnType<typeof getBiometricThresholds>;
  health_endpoint: string;
  capture_endpoint: string;
  blockers: string[];
}

export function getBiometricEngineHealth(): BiometricEngineHealth {
  const thresholds = getBiometricThresholds();
  const autoApprove = isBiometricAutoApproveEnabled();
  const blockers: string[] = [];

  // Production default: human review only is intentional, not a blocker.
  if (autoApprove) {
    blockers.push("Auto-approve enabled — monitor false-positive rate in production");
  }

  const status: BiometricEngineStatus = "live";
  const summary = autoApprove
    ? "Abraxas Verify engine v1 is active with auto-approve (L3 on pass)."
    : "Abraxas Verify engine v1 is active. All captures queue for human review (auto-approve disabled).";

  const productionPolicy = autoApprove
    ? "auto_approve_enabled"
    : "human_review_only";

  return {
    engine: BIOMETRIC_ENGINE_VERSION,
    status,
    label: "Abraxas Verify biometric engine",
    summary,
    auto_approve_enabled: autoApprove,
    production_policy: productionPolicy,
    rate_limit_per_hour: getCaptureRateLimitPerHour(),
    retention: {
      document_images_days: BIOMETRIC_DOCUMENT_RETENTION_DAYS,
      assessment_scores_days: BIOMETRIC_ASSESSMENT_RETENTION_DAYS,
    },
    thresholds,
    health_endpoint: "/api/idv/biometric/status",
    capture_endpoint: "POST /api/identity/documents/capture",
    blockers,
  };
}
