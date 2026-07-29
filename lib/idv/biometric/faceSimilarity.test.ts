// FILE: lib/idv/biometric/faceSimilarity.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { compareIdAndSelfie } from "./faceSimilarity";
import { resetOnnxSessionForTests } from "./faceEmbeddingOnnx";

async function variedImage(seed: number): Promise<Buffer> {
  const pixels = Buffer.alloc(320 * 320 * 3);
  for (let i = 0; i < pixels.length; i += 3) {
    const v = (i * seed) % 255;
    pixels[i] = v;
    pixels[i + 1] = (v + 40) % 255;
    pixels[i + 2] = (v + 80) % 255;
  }
  return sharp(pixels, { raw: { width: 320, height: 320, channels: 3 } }).jpeg().toBuffer();
}

describe("compareIdAndSelfie", () => {
  const prev = process.env.ABRAXAS_FACE_MATCH_PROVIDER;
  const prevModel = process.env.ABRAXAS_FACE_EMBEDDING_MODEL;

  beforeEach(() => {
    resetOnnxSessionForTests();
  });

  afterEach(() => {
    resetOnnxSessionForTests();
    if (prev === undefined) delete process.env.ABRAXAS_FACE_MATCH_PROVIDER;
    else process.env.ABRAXAS_FACE_MATCH_PROVIDER = prev;
    if (prevModel === undefined) delete process.env.ABRAXAS_FACE_EMBEDDING_MODEL;
    else process.env.ABRAXAS_FACE_EMBEDDING_MODEL = prevModel;
  });

  it("returns correlation method when provider is correlation", async () => {
    process.env.ABRAXAS_FACE_MATCH_PROVIDER = "correlation";
    const img = await variedImage(7);
    const result = await compareIdAndSelfie(img, img);
    expect(result.method).toBe("correlation");
    expect(result.score).toBeGreaterThan(0.85);
  });

  it("scores different images lower than identical buffers", async () => {
    process.env.ABRAXAS_FACE_MATCH_PROVIDER = "correlation";
    const a = await variedImage(3);
    const b = await variedImage(19);
    const same = await compareIdAndSelfie(a, a);
    const diff = await compareIdAndSelfie(a, b);
    expect(same.score).toBeGreaterThanOrEqual(diff.score);
    expect(same.score).toBeGreaterThan(0.8);
  });

  it("falls back to correlation when ONNX model is missing", async () => {
    delete process.env.ABRAXAS_FACE_MATCH_PROVIDER;
    process.env.ABRAXAS_FACE_EMBEDDING_MODEL = join(process.cwd(), "models", "definitely-missing.onnx");
    const img = await variedImage(11);
    const result = await compareIdAndSelfie(img, img);
    expect(result.method).toBe("correlation");
    expect(result.score).toBeGreaterThan(0.8);
  });

  it("runs ONNX embeddings when model file is present", async () => {
    const model = join(process.cwd(), "models", "mobilefacenet.onnx");
    if (!existsSync(model)) return;

    delete process.env.ABRAXAS_FACE_MATCH_PROVIDER;
    process.env.ABRAXAS_FACE_EMBEDDING_MODEL = model;
    const img = await variedImage(5);
    const result = await compareIdAndSelfie(img, img);
    expect(result.method).toBe("onnx_embedding");
    expect(result.score).toBeGreaterThan(0.5);
  });
});
