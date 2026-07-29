// FILE: lib/idv/biometric/partnerThresholds.ts
// Merge global env thresholds with optional partner policy overrides.

import type { PartnerBiometricThresholdRules, PartnerPolicyRules } from "@/lib/policy/types";
import { getBiometricThresholds as getGlobalThresholds } from "./thresholds";
import type { BiometricThresholds } from "./types";

export type { PartnerBiometricThresholdRules } from "@/lib/policy/types";

export interface ExtendedBiometricThresholds extends BiometricThresholds {
  alignmentMin: number;
  blurMin: number;
  lightingMin: number;
  occlusionMin: number;
  screenReplayMax: number;
  deepfakeMax: number;
  policySource: "global" | "partner";
  partnerId?: string;
}

const EXTENDED_DEFAULTS = {
  alignmentMin: 0.38,
  blurMin: 0.28,
  lightingMin: 0.32,
  occlusionMin: 0.35,
  screenReplayMax: 0.62,
  deepfakeMax: 0.75,
} as const;

function mergeThresholds(
  base: BiometricThresholds,
  partner?: PartnerBiometricThresholdRules,
  partnerId?: string,
): ExtendedBiometricThresholds {
  if (!partner) {
    return { ...base, ...EXTENDED_DEFAULTS, policySource: "global" };
  }

  return {
    faceMin: partner.face_min ?? base.faceMin,
    livenessMin: partner.liveness_min ?? base.livenessMin,
    documentMin: partner.document_min ?? base.documentMin,
    selfieMin: partner.selfie_min ?? base.selfieMin,
    autoApproveFace: partner.auto_approve_face ?? base.autoApproveFace,
    autoApproveLiveness: partner.auto_approve_liveness ?? base.autoApproveLiveness,
    facePresenceMin: partner.face_presence_min ?? base.facePresenceMin,
    documentAspectMin: partner.document_aspect_min ?? base.documentAspectMin,
    documentClassMin: partner.document_class_min ?? base.documentClassMin,
    alignmentMin: partner.alignment_min ?? EXTENDED_DEFAULTS.alignmentMin,
    blurMin: partner.blur_min ?? EXTENDED_DEFAULTS.blurMin,
    lightingMin: partner.lighting_min ?? EXTENDED_DEFAULTS.lightingMin,
    occlusionMin: partner.occlusion_min ?? EXTENDED_DEFAULTS.occlusionMin,
    screenReplayMax: partner.screen_replay_max ?? EXTENDED_DEFAULTS.screenReplayMax,
    deepfakeMax: partner.deepfake_max ?? EXTENDED_DEFAULTS.deepfakeMax,
    policySource: "partner",
    partnerId,
  };
}

export function biometricRulesFromPolicy(
  rules?: PartnerPolicyRules | null,
): PartnerBiometricThresholdRules | undefined {
  const raw = rules?.biometric_thresholds;
  if (!raw || typeof raw !== "object") return undefined;
  return raw as PartnerBiometricThresholdRules;
}

export function resolveBiometricThresholds(input?: {
  partnerId?: string;
  policyRules?: PartnerPolicyRules | null;
}): ExtendedBiometricThresholds {
  const global = getGlobalThresholds();
  const partnerRules = biometricRulesFromPolicy(input?.policyRules);
  return mergeThresholds(global, partnerRules, input?.partnerId);
}
