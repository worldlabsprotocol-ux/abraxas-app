// FILE: lib/idv/biometric/clientPreflight.ts
// Browser-side capture quality checks before upload (mirrors server heuristics).

export type CapturePreflightKind = "id_front" | "selfie";

export interface CapturePreflightResult {
  ok: boolean;
  score: number;
  issues: string[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function analyzeCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): { brightness: number; variance: number; sharpness: number } {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sum = 0;
  let sumSq = 0;
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(g);
    sum += g;
    sumSq += g * g;
  }
  const n = gray.length || 1;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;

  let lapSum = 0;
  let lapCount = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        -gray[i - w] - gray[i - 1] + 4 * gray[i] - gray[i + 1] - gray[i + w];
      lapSum += lap * lap;
      lapCount++;
    }
  }
  const sharpness = lapCount > 0 ? lapSum / lapCount : 0;

  return { brightness: mean / 255, variance, sharpness };
}

export async function runCapturePreflight(
  blob: Blob,
  kind: CapturePreflightKind,
): Promise<CapturePreflightResult> {
  const issues: string[] = [];

  if (blob.size < 8_000) {
    return { ok: false, score: 0, issues: ["Image file is too small — retake with your camera."] };
  }

  const img = await loadImageFromBlob(blob);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  const maxDim = 256;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ok: true, score: 0.5, issues: [] };
  }
  ctx.drawImage(img, 0, 0, w, h);

  const { brightness, variance, sharpness } = analyzeCanvas(ctx, w, h);
  const minDim = Math.min(srcW, srcH);

  const resolutionScore = clamp01((minDim - 320) / 880);
  const brightnessScore = clamp01(1 - Math.abs(brightness * 255 - 128) / 128);
  const sharpnessScore = clamp01(sharpness / 500);
  const varianceScore = clamp01(variance / 2000);

  let score = clamp01(
    resolutionScore * 0.35 +
    brightnessScore * 0.25 +
    sharpnessScore * 0.25 +
    varianceScore * 0.15,
  );

  if (kind === "id_front") {
    const ratio = Math.max(srcW, srcH) / Math.min(srcW, srcH);
    const aspectOk = ratio >= 1.2 && ratio <= 2.1 && srcW >= srcH;
    if (!aspectOk) {
      issues.push("Hold your ID horizontally and fill the frame.");
      score *= 0.7;
    }
  }

  if (minDim < 400) issues.push("Move closer — image resolution is too low.");
  if (brightness < 0.25) issues.push("Scene is too dark — add light or move to a brighter area.");
  if (brightness > 0.92) issues.push("Scene is overexposed — reduce glare on the ID or face.");
  if (sharpnessScore < 0.2) issues.push("Image looks blurry — hold steady and tap to focus.");
  if (kind === "selfie" && varianceScore < 0.15) issues.push("Selfie looks flat — ensure your face is visible.");

  const minScore = kind === "id_front" ? 0.38 : 0.34;
  const ok = score >= minScore && issues.length === 0;

  return { ok, score, issues: ok ? [] : issues };
}
