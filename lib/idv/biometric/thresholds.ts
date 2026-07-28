// FILE: lib/idv/biometric/thresholds.ts

import type { BiometricThresholds } from "./types";

function parseEnvFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getBiometricThresholds(): BiometricThresholds {
  return {
    faceMin: parseEnvFloat("ABRAXAS_BIOMETRIC_FACE_MIN", 0.45),
    livenessMin: parseEnvFloat("ABRAXAS_BIOMETRIC_LIVENESS_MIN", 0.4),
    documentMin: parseEnvFloat("ABRAXAS_BIOMETRIC_DOCUMENT_MIN", 0.35),
    selfieMin: parseEnvFloat("ABRAXAS_BIOMETRIC_SELFIE_MIN", 0.35),
    autoApproveFace: parseEnvFloat("ABRAXAS_BIOMETRIC_AUTO_FACE", 0.68),
    autoApproveLiveness: parseEnvFloat("ABRAXAS_BIOMETRIC_AUTO_LIVENESS", 0.62),
    facePresenceMin: parseEnvFloat("ABRAXAS_BIOMETRIC_FACE_PRESENCE_MIN", 0.32),
    documentAspectMin: parseEnvFloat("ABRAXAS_BIOMETRIC_DOCUMENT_ASPECT_MIN", 0.38),
    documentClassMin: parseEnvFloat("ABRAXAS_BIOMETRIC_DOCUMENT_CLASS_MIN", 0.35),
  };
}

export function isBiometricAutoApproveEnabled(): boolean {
  const v = process.env.ABRAXAS_BIOMETRIC_AUTO_APPROVE?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
