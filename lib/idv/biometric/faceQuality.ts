// FILE: lib/idv/biometric/faceQuality.ts
// Decomposed selfie quality: blur, lighting, occlusion proxies.

import type { FacePresenceResult } from "./facePresence";
import type { ImageSignalResult } from "./imageSignals";

export interface FaceQualityBreakdown {
  blur: number;
  lighting: number;
  occlusion: number;
  composite: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Split selfie quality into measurable dimensions for explainability.
 * Occlusion is heuristic (no landmarks): low center edges + high skin asymmetry.
 */
export function scoreFaceQuality(
  image: ImageSignalResult,
  face: FacePresenceResult,
): FaceQualityBreakdown {
  const blur = clamp01(image.sharpness);
  const lighting = clamp01(1 - Math.abs(image.brightness - 0.48) / 0.48);

  const edgeOk = clamp01(face.edge_density * 2.8);
  const varianceOk = clamp01(face.center_variance / 900);
  const skinOk = clamp01(face.skin_ratio * 3.5);
  const occlusionRisk = clamp01(
    (skinOk > 0.45 && edgeOk < 0.22 ? 0.55 : 0) +
    (varianceOk < 0.18 && skinOk > 0.35 ? 0.25 : 0),
  );
  const occlusion = clamp01(1 - occlusionRisk);

  const composite = clamp01(blur * 0.35 + lighting * 0.3 + occlusion * 0.35);

  return { blur, lighting, occlusion, composite };
}
