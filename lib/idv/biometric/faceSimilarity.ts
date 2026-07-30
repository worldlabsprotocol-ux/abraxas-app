// FILE: lib/idv/biometric/faceSimilarity.ts
// Face-region similarity between ID photo and selfie (Abraxas engine v3).

import "server-only";

import { compareWithCorrelation } from "./faceSimilarityCorrelation";
import { resolveFaceMatchMethod, type FaceMatchMethod } from "./faceMatchProvider";

export type { FaceMatchMethod };

export interface FaceMatchResult {
  score: number;
  method: FaceMatchMethod;
}

/**
 * Compare ID front and selfie. Returns 0–1 similarity plus which backend produced it.
 * ONNX embeddings when configured; correlation fallback on missing model or errors.
 */
export async function compareIdAndSelfie(idBuffer: Buffer, selfieBuffer: Buffer): Promise<FaceMatchResult> {
  const preferred = resolveFaceMatchMethod();
  if (preferred === "onnx_embedding") {
    try {
      const { compareWithOnnxEmbeddings } = await import("./faceEmbeddingOnnx");
      const score = await compareWithOnnxEmbeddings(idBuffer, selfieBuffer);
      return { score, method: "onnx_embedding" };
    } catch (err) {
      console.warn("[faceSimilarity] ONNX embedding match failed, using correlation fallback", err);
    }
  }

  const score = await compareWithCorrelation(idBuffer, selfieBuffer);
  return { score, method: "correlation" };
}
