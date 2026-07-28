// FILE: lib/idv/biometric/tamperSignals.ts
// Screenshot / flat-copy heuristics (v2 placeholder for full tamper detection).

import sharp from "sharp";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Higher = more likely screen capture or digitally flat paste.
 * 0 = no tamper indicators, 1 = strong tamper/screen signal.
 */
export async function estimateTamperScore(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(128, 128, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const border = 8;
  let borderEdge = 0;
  let interiorVar = 0;
  let interiorCount = 0;
  const gray: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray.push(lum);
    }
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = Math.abs(
        -gray[i - w] - gray[i - 1] + 4 * gray[i] - gray[i + 1] - gray[i + w],
      );
      const onBorder = x < border || y < border || x >= w - border || y >= h - border;
      if (onBorder) borderEdge += lap;
      else {
        interiorVar += gray[i];
        interiorCount++;
      }
    }
  }

  const interiorMean = interiorCount ? interiorVar / interiorCount : 0;
  let interiorSq = 0;
  for (let y = border; y < h - border; y++) {
    for (let x = border; x < w - border; x++) {
      const d = gray[y * w + x] - interiorMean;
      interiorSq += d * d;
    }
  }
  const variance = interiorCount ? interiorSq / interiorCount : 0;
  const borderScore = clamp01((borderEdge / ((w + h) * 2)) / 80);
  const flatInterior = variance < 120 ? 0.45 : 0;
  return clamp01(borderScore * 0.55 + flatInterior);
}
