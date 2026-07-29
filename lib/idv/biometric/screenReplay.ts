// FILE: lib/idv/biometric/screenReplay.ts
// Screen replay / moiré heuristics (complements tamperSignals border detection).

import sharp from "sharp";

export interface ScreenReplayResult {
  screen_replay_score: number;
  digital_tamper_score: number;
  combined_tamper_score: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Horizontal band energy — screens often show periodic refresh/moiré patterns. */
function horizontalBandEnergy(gray: Uint8Array, w: number, h: number): number {
  let energy = 0;
  for (let y = 2; y < h - 2; y++) {
    let rowDiff = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      rowDiff += Math.abs(gray[i] - gray[i - w * 2]);
    }
    energy += rowDiff / w;
  }
  return energy / h;
}

/**
 * Estimate screen-replay likelihood separately from generic tamper.
 */
export async function analyzeScreenReplay(buffer: Buffer): Promise<ScreenReplayResult> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(128, 128, { fit: "cover" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const gray = new Uint8Array(data);

  const bandEnergy = horizontalBandEnergy(gray, w, h);
  const screenReplayScore = clamp01((bandEnergy - 8) / 40);

  const { estimateTamperScore } = await import("./tamperSignals");
  const digitalTamperScore = await estimateTamperScore(buffer);

  const combined = clamp01(screenReplayScore * 0.55 + digitalTamperScore * 0.45);

  return {
    screen_replay_score: round4(screenReplayScore),
    digital_tamper_score: round4(digitalTamperScore),
    combined_tamper_score: round4(combined),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
