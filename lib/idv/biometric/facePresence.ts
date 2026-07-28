// FILE: lib/idv/biometric/facePresence.ts
// Heuristic face-region detection (v2) — no external ML dependency.

import sharp from "sharp";

export interface FacePresenceResult {
  score: number;
  skin_ratio: number;
  center_variance: number;
  edge_density: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Typical human skin in RGB (broad range for lighting variance). */
function isSkinTone(r: number, g: number, b: number): boolean {
  if (r < 40 || g < 20 || b < 15) return false;
  if (r > 250 && g > 250 && b > 250) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 12) return false;
  return (
    r > g * 0.85
    && r > b * 1.05
    && g >= b * 0.75
    && r < 245
    && (r - b) > 15
  );
}

/**
 * Estimate whether a human face is likely present (0–1).
 * Uses skin-tone clustering + center variance + edge density in attention crop.
 */
export async function detectFacePresence(buffer: Buffer): Promise<FacePresenceResult> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(96, 96, { fit: "cover", position: "attention" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  let skinCount = 0;
  let sum = 0;
  let sumSq = 0;
  const gray: number[] = [];

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isSkinTone(r, g, b)) skinCount++;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray.push(lum);
    sum += lum;
    sumSq += lum * lum;
  }

  const mean = pixels ? sum / pixels : 0;
  const variance = pixels ? sumSq / pixels - mean * mean : 0;
  const skinRatio = pixels ? skinCount / pixels : 0;

  let edgeSum = 0;
  let edgeCount = 0;
  const w = info.width;
  const h = info.height;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = Math.abs(
        -gray[i - w] - gray[i - 1] + 4 * gray[i] - gray[i + 1] - gray[i + w],
      );
      edgeSum += lap;
      edgeCount++;
    }
  }
  const edgeDensity = edgeCount ? edgeSum / edgeCount / 255 : 0;

  const skinScore = clamp01(skinRatio * 4.5);
  const varianceScore = clamp01(variance / 1200);
  const edgeScore = clamp01(edgeDensity * 3.2);

  // Flat walls/sky: low skin, low variance, low edges
  const flatPenalty = variance < 80 && skinRatio < 0.02 ? 0.35 : 0;

  const score = clamp01(
    skinScore * 0.55 + varianceScore * 0.2 + edgeScore * 0.25 - flatPenalty,
  );

  return {
    score,
    skin_ratio: skinRatio,
    center_variance: variance,
    edge_density: edgeDensity,
  };
}
