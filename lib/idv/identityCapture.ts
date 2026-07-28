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
      return "Government ID";
    case "selfie":
      return "Selfie";
    case "review":
      return "Review & submit";
  }
}

export function identityCaptureStepHint(step: IdentityCaptureStep): string {
  switch (step) {
    case "name":
      return "Enter the name exactly as it appears on your ID.";
    case "id_front":
      return "Photograph the front of your passport, license, or national ID.";
    case "selfie":
      return "Take a clear selfie — we match it to your ID photo.";
    case "review":
      return "Confirm everything looks right, then submit for Abraxas Verify.";
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
