// FILE: lib/idv/biometric/documentClassifier.ts
// Government ID layout + document-type heuristics (v2).

import sharp from "sharp";
import { documentAspectScore } from "./documentSignals";

export type DocumentClass = "passport" | "drivers_license" | "national_id" | "unknown";

export interface DocumentClassification {
  document_class: DocumentClass;
  confidence: number;
  aspect_score: number;
  edge_density: number;
  is_landscape: boolean;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function classifyByAspect(ratio: number): { document_class: DocumentClass; confidence: number } {
  const passportDist = Math.abs(ratio - 1.42);
  const cardDist = Math.abs(ratio - 1.586);

  if (passportDist < 0.18) {
    return { document_class: "passport", confidence: clamp01(1 - passportDist / 0.35) };
  }
  if (cardDist < 0.22) {
    return { document_class: "drivers_license", confidence: clamp01(1 - cardDist / 0.4) };
  }
  if (ratio >= 1.25 && ratio <= 1.75) {
    return { document_class: "national_id", confidence: clamp01(0.55 - Math.min(passportDist, cardDist) * 0.3) };
  }
  return { document_class: "unknown", confidence: clamp01(0.25 - Math.min(passportDist, cardDist) * 0.1) };
}

/** Detect ID-like document structure in capture buffer. */
export async function classifyIdentityDocument(buffer: Buffer): Promise<DocumentClassification> {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const isLandscape = width >= height;
  const aspectScore = documentAspectScore(width, height);
  const ratio = width > 0 && height > 0 ? Math.max(width, height) / Math.min(width, height) : 0;
  const { document_class, confidence: classConf } = classifyByAspect(ratio);

  const { data, info } = await img
    .resize(128, 128, { fit: "cover" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gray = Array.from(data);
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
  const edgeScore = clamp01(edgeDensity * 2.8);

  const structureScore = clamp01(aspectScore * 0.5 + edgeScore * 0.35 + classConf * 0.15);
  const portraitPenalty = isLandscape ? 0 : 0.4;

  return {
    document_class,
    confidence: clamp01(structureScore - portraitPenalty),
    aspect_score: aspectScore,
    edge_density: edgeDensity,
    is_landscape: isLandscape,
  };
}
