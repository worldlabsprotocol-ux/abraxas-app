// FILE: lib/idv/biometric/faceMatchProvider.ts
// Select face-match backend: ONNX embeddings (preferred) or correlation fallback.

export type FaceMatchMethod = "onnx_embedding" | "correlation";

export function resolveFaceMatchMethod(): FaceMatchMethod {
  const provider = process.env.ABRAXAS_FACE_MATCH_PROVIDER?.trim().toLowerCase();
  if (provider === "correlation") return "correlation";
  // Default to ONNX when provider unset or explicitly onnx.
  return "onnx_embedding";
}
