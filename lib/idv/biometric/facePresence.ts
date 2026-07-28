// FILE: lib/idv/biometric/facePresence.ts
// Heuristic face-region detection (v2) — no external ML dependency.

import sharp from "sharp";

export interface FacePresenceResult {
  score: number;
  skin_ratio: number;
  center_variance: number;
  edge_density: number;
  face_count_estimate: number;
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

  const faceCountEstimate = estimateFaceCount(data, w, h);

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
    face_count_estimate: faceCountEstimate,
  };
}

/** Estimate face count: two separated skin regions (gap in center) → 2 faces. */
function estimateFaceCount(data: Buffer, w: number, h: number): number {
  let leftSkin = 0;
  let centerSkin = 0;
  let rightSkin = 0;
  const leftBound = w / 3;
  const rightBound = (2 * w) / 3;
  let totalSkin = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      if (!isSkinTone(data[i], data[i + 1], data[i + 2])) continue;
      totalSkin++;
      if (x < leftBound) leftSkin++;
      else if (x >= rightBound) rightSkin++;
      else centerSkin++;
    }
  }

  if (totalSkin === 0) return 0;
  const minSide = Math.max(6, totalSkin * 0.18);
  const centerGap = centerSkin < totalSkin * 0.12;
  if (leftSkin >= minSide && rightSkin >= minSide && centerGap) return 2;
  if (totalSkin > 0) return 1;

  const cols = 4;
  const rows = 4;
  const blockW = Math.floor(w / cols);
  const blockH = Math.floor(h / rows);
  const activeBlocks: { x: number; y: number }[] = [];

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let skin = 0;
      let total = 0;
      for (let y = by * blockH; y < (by + 1) * blockH && y < h; y++) {
        for (let x = bx * blockW; x < (bx + 1) * blockW && x < w; x++) {
          const i = (y * w + x) * 3;
          if (isSkinTone(data[i], data[i + 1], data[i + 2])) skin++;
          total++;
        }
      }
      if (total > 0 && skin / total > 0.18) {
        activeBlocks.push({ x: bx, y: by });
      }
    }
  }

  if (activeBlocks.length < 2) return activeBlocks.length > 0 ? 1 : 0;

  let clusters = 0;
  const visited = new Set<string>();
  for (const block of activeBlocks) {
    const key = `${block.x},${block.y}`;
    if (visited.has(key)) continue;
    clusters++;
    const queue = [block];
    visited.add(key);
    while (queue.length) {
      const cur = queue.pop()!;
      for (const nb of activeBlocks) {
        const nk = `${nb.x},${nb.y}`;
        if (visited.has(nk)) continue;
        const dist = Math.abs(nb.x - cur.x) + Math.abs(nb.y - cur.y);
        if (dist <= 1.5) {
          visited.add(nk);
          queue.push(nb);
        }
      }
    }
  }
  return clusters;
}
