// FILE: lib/idv/biometric/faceAlignment.ts
// Face alignment heuristics without external ML (centroid, coverage, symmetry).

import sharp from "sharp";

export interface FaceAlignmentResult {
  score: number;
  center_offset_x: number;
  center_offset_y: number;
  face_coverage: number;
  symmetry_score: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function isSkinTone(r: number, g: number, b: number): boolean {
  if (r < 40 || g < 20 || b < 15) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 12) return false;
  return r > g * 0.85 && r > b * 1.05 && g >= b * 0.75 && (r - b) > 15;
}

/** Estimate face centering and coverage from skin-tone distribution. */
export async function analyzeFaceAlignment(buffer: Buffer): Promise<FaceAlignmentResult> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(96, 96, { fit: "cover", position: "attention" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  let skinSumX = 0;
  let skinSumY = 0;
  let skinCount = 0;
  let leftSkin = 0;
  let rightSkin = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      if (!isSkinTone(data[i], data[i + 1], data[i + 2])) continue;
      skinSumX += x;
      skinSumY += y;
      skinCount++;
      if (x < w / 2) leftSkin++;
      else rightSkin++;
    }
  }

  if (skinCount === 0) {
    return {
      score: 0,
      center_offset_x: 1,
      center_offset_y: 1,
      face_coverage: 0,
      symmetry_score: 0,
    };
  }

  const cx = skinSumX / skinCount;
  const cy = skinSumY / skinCount;
  const centerOffsetX = Math.abs(cx - w / 2) / (w / 2);
  const centerOffsetY = Math.abs(cy - h / 2) / (h / 2);
  const faceCoverage = skinCount / (w * h);
  const symmetry = leftSkin + rightSkin > 0
    ? 1 - Math.abs(leftSkin - rightSkin) / (leftSkin + rightSkin)
    : 0;

  const centerScore = clamp01(1 - (centerOffsetX * 0.6 + centerOffsetY * 0.4));
  const coverageScore = clamp01((faceCoverage - 0.04) / 0.22);
  const symmetryScore = clamp01(symmetry);

  const score = clamp01(centerScore * 0.45 + coverageScore * 0.35 + symmetryScore * 0.2);

  return {
    score,
    center_offset_x: round4(centerOffsetX),
    center_offset_y: round4(centerOffsetY),
    face_coverage: round4(faceCoverage),
    symmetry_score: round4(symmetryScore),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
