// FILE: lib/idv/biometric/faceEmbeddingOnnx.ts
// ONNX embedding-based face match (ArcFace-style 112×112 → 512-d cosine similarity).

import { existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const INPUT_SIZE = 112;

let sessionPromise: Promise<import("onnxruntime-node").InferenceSession> | null = null;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function modelPath(): string {
  return process.env.ABRAXAS_FACE_EMBEDDING_MODEL?.trim()
    || join(process.cwd(), "models", "mobilefacenet.onnx");
}

async function getSession() {
  if (!sessionPromise) {
    const path = modelPath();
    if (!existsSync(path)) {
      throw new Error(`Face embedding model not found at ${path}`);
    }
    const ort = await import("onnxruntime-node");
    sessionPromise = ort.InferenceSession.create(path, {
      executionProviders: ["cpu"],
    });
  }
  return sessionPromise;
}

async function imageToNhwcTensor(buffer: Buffer): Promise<Float32Array> {
  const { data } = await sharp(buffer)
    .rotate()
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "cover", position: "attention" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const src = (y * INPUT_SIZE + x) * 3;
      const dst = src;
      tensor[dst] = (data[src] - 127.5) / 128;
      tensor[dst + 1] = (data[src + 1] - 127.5) / 128;
      tensor[dst + 2] = (data[src + 2] - 127.5) / 128;
    }
  }
  return tensor;
}

function l2Normalize(vec: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

async function embedImage(buffer: Buffer): Promise<Float32Array> {
  const session = await getSession();
  const ort = await import("onnxruntime-node");
  const tensor = await imageToNhwcTensor(buffer);
  const inputName = session.inputNames[0] ?? "input_1";
  const outputName = session.outputNames[0] ?? "embedding";
  const feeds = {
    [inputName]: new ort.Tensor("float32", tensor, [1, INPUT_SIZE, INPUT_SIZE, 3]),
  };
  const result = await session.run(feeds);
  const raw = result[outputName]?.data;
  if (!(raw instanceof Float32Array) && !Array.isArray(raw)) {
    throw new Error("Unexpected ONNX embedding output");
  }
  const embedding = raw instanceof Float32Array ? raw : new Float32Array(raw);
  return l2Normalize(embedding);
}

/** Cosine similarity of L2-normalized embeddings, mapped to 0–1. */
export async function compareWithOnnxEmbeddings(idBuffer: Buffer, selfieBuffer: Buffer): Promise<number> {
  const [idEmb, selfieEmb] = await Promise.all([
    embedImage(idBuffer),
    embedImage(selfieBuffer),
  ]);
  const cosine = cosineSimilarity(idEmb, selfieEmb);
  // ArcFace cosine for matched faces is typically 0.35–0.95; map conservatively to 0–1.
  return clamp01((cosine - 0.15) / 0.75);
}

export function resetOnnxSessionForTests(): void {
  sessionPromise = null;
}
