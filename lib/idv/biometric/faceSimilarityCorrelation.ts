// FILE: lib/idv/biometric/faceSimilarityCorrelation.ts
// Legacy correlation-based face match (fallback when ONNX is unavailable).

import sharp from "sharp";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

async function centerCropGrayscale(buffer: Buffer, size: number): Promise<Float32Array> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(size, size, { fit: "cover", position: "attention" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = new Float32Array(info.width * info.height);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] / 255;
  }
  return out;
}

function correlation(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < a.length; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / a.length;
  const meanB = sumB / b.length;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den === 0) return 0;
  return num / den;
}

/** Normalized cross-correlation on attention-cropped grayscale regions. */
export async function compareWithCorrelation(idBuffer: Buffer, selfieBuffer: Buffer): Promise<number> {
  const size = 64;
  const [idCrop, selfieCrop] = await Promise.all([
    centerCropGrayscale(idBuffer, size),
    centerCropGrayscale(selfieBuffer, size),
  ]);
  const raw = correlation(idCrop, selfieCrop);
  return clamp01((raw + 1) / 2);
}
