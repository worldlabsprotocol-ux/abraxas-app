// FILE: lib/idv/identityCapture.ts
// Types for Abraxas-native identity capture (name + ID + selfie).

export type IdentityCaptureDocumentType = "id_front" | "selfie";

export const IDENTITY_CAPTURE_STEPS = ["name", "id_front", "selfie", "review"] as const;
export type IdentityCaptureStep = (typeof IDENTITY_CAPTURE_STEPS)[number];

export function identityCaptureStepLabel(step: IdentityCaptureStep): string {
  switch (step) {
    case "name":
      return "Legal name";
    case "id_front":
      return "Government ID (front)";
    case "selfie":
      return "Selfie";
    case "review":
      return "Review & submit";
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
