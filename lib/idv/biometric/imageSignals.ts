// FILE: lib/idv/biometric/imageSignals.ts
// Image quality + liveness heuristics from capture buffers (Abraxas engine v1).

import sharp from "sharp";

export interface ImageSignalResult {
  width: number;
  height: number;
  brightness: number;
  sharpness: number;
  variance: number;
  quality: number;
}

/** Laplacian variance proxy for blur detection (higher = sharper). */
function laplacianVariance(gray: Uint8Array, w: number, h: number): number {
  let sum = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        -gray[i - w] - gray[i - 1] + 4 * gray[i] - gray[i + 1] - gray[i + w];
      sum += lap * lap;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function analyzeImageBuffer(buffer: Buffer): Promise<ImageSignalResult> {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const { data } = await img
    .resize(128, 128, { fit: "cover" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gray = new Uint8Array(data);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
    sumSq += gray[i] * gray[i];
  }
  const mean = gray.length ? sum / gray.length : 0;
  const variance = gray.length ? sumSq / gray.length - mean * mean : 0;
  const sharpness = laplacianVariance(gray, 128, 128);

  const minDim = Math.min(w, h);
  const resolutionScore = clamp01((minDim - 320) / 880);
  const brightnessScore = clamp01(1 - Math.abs(mean - 128) / 128);
  const sharpnessScore = clamp01(sharpness / 500);
  const varianceScore = clamp01(variance / 2000);

  const quality = clamp01(
    resolutionScore * 0.35 +
    brightnessScore * 0.25 +
    sharpnessScore * 0.25 +
    varianceScore * 0.15,
  );

  return {
    width: w,
    height: h,
    brightness: mean / 255,
    sharpness: sharpnessScore,
    variance: varianceScore,
    quality,
  };
}

/** Single-frame liveness proxy: reject flat/uniform or tiny captures. */
export function livenessFromSelfieSignals(signals: ImageSignalResult): number {
  const sizeOk = clamp01((Math.min(signals.width, signals.height) - 240) / 600);
  const texture = clamp01(signals.variance * 1.4);
  const sharp = signals.sharpness;
  return clamp01(sizeOk * 0.35 + texture * 0.35 + sharp * 0.3);
}
