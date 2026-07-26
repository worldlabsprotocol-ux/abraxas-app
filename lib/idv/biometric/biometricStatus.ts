// FILE: lib/idv/biometric/biometricStatus.ts
// Runtime health for the Abraxas Verify biometric engine.

import { BIOMETRIC_ENGINE_VERSION } from "./analyzeCapture";
import { getBiometricThresholds, isBiometricAutoApproveEnabled } from "./thresholds";

export type BiometricEngineStatus = "live" | "partial" | "not_configured";

export interface BiometricEngineHealth {
  engine: typeof BIOMETRIC_ENGINE_VERSION;
  status: BiometricEngineStatus;
  label: string;
  summary: string;
  auto_approve_enabled: boolean;
  thresholds: ReturnType<typeof getBiometricThresholds>;
  health_endpoint: string;
  capture_endpoint: string;
  blockers: string[];
}

export function getBiometricEngineHealth(): BiometricEngineHealth {
  const thresholds = getBiometricThresholds();
  const autoApprove = isBiometricAutoApproveEnabled();
  const blockers: string[] = [];

  if (!autoApprove) {
    blockers.push(
      "Set ABRAXAS_BIOMETRIC_AUTO_APPROVE=1 to enable instant L3 after engine pass",
    );
  }

  const status: BiometricEngineStatus = autoApprove ? "live" : "partial";
  const summary = autoApprove
    ? "Abraxas Verify engine v1 is active with auto-approve (L3 on pass)."
    : "Abraxas Verify engine v1 is active; captures queue for human review until auto-approve is enabled.";

  return {
    engine: BIOMETRIC_ENGINE_VERSION,
    status,
    label: "Abraxas Verify biometric engine",
    summary,
    auto_approve_enabled: autoApprove,
    thresholds,
    health_endpoint: "/api/idv/biometric/status",
    capture_endpoint: "POST /api/identity/documents/capture",
    blockers,
  };
}
