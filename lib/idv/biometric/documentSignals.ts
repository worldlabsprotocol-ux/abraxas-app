// FILE: lib/idv/biometric/documentSignals.ts
// Government ID layout heuristics (aspect ratio, orientation).

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Score 0–1 for ID-like aspect ratio (landscape card or passport spread). */
export function documentAspectScore(width: number, height: number): number {
  if (width < 1 || height < 1) return 0;

  const landscape = width >= height;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const ratio = long / short;

  // ID-1 card ~1.586; passport data page ~1.42; allow some crop variance
  const cardTarget = 1.586;
  const passportTarget = 1.42;
  const cardScore = clamp01(1 - Math.abs(ratio - cardTarget) / 0.55);
  const passportScore = clamp01(1 - Math.abs(ratio - passportTarget) / 0.5);
  const bestRatio = Math.max(cardScore, passportScore);

  const orientationBonus = landscape ? 0.15 : -0.25;
  return clamp01(bestRatio * 0.85 + orientationBonus);
}

/** Blend document quality with layout intelligence. */
export function documentQualityScore(
  baseQuality: number,
  width: number,
  height: number,
): number {
  const aspect = documentAspectScore(width, height);
  return clamp01(baseQuality * 0.75 + aspect * 0.25);
}
