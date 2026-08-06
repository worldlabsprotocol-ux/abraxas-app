// FILE: lib/idv/identityCaptureCopy.ts
// User-facing copy for Passport device camera capture (testable, no biometric logic).

export type IdentityCameraCaptureKind = "id_front" | "selfie";

export const CAMERA_CAPTURE_COPY = {
  openCamera: "Open camera",
  retake: "Retake photo",
  permissionLead:
    "Your device will open its camera app. Allow camera access when prompted, then take the photo.",
  qualityReminder:
    "Hold steady in good lighting. Avoid blur, glare, and cropped edges — Abraxas will check photo quality before you continue.",
} as const;

export interface IdentityCameraCaptureCopy {
  label: string;
  hint: string;
  permissionNote: string;
  openCameraAriaLabel: string;
  retakeAriaLabel: string;
  allowCameraSwitch: boolean;
  facingMode: "user" | "environment";
  facingHint: string;
}

export function identityCameraCaptureCopy(
  kind: IdentityCameraCaptureKind,
): IdentityCameraCaptureCopy {
  if (kind === "id_front") {
    return {
      label: "Government ID — front side",
      hint:
        "Photograph the front of your passport, driver's license, or national ID. Fill the frame, keep text readable, and use good lighting. You do not need to photograph the back in this step.",
      permissionNote: CAMERA_CAPTURE_COPY.permissionLead,
      openCameraAriaLabel: "Open camera to photograph the front of your government ID",
      retakeAriaLabel: "Retake photo of the front of your government ID",
      allowCameraSwitch: true,
      facingMode: "environment",
      facingHint: "Uses your rear camera by default.",
    };
  }

  return {
    label: "Selfie — face verification",
    hint:
      "Use your front camera. Look straight at the lens with your face centered. We'll compare this photo to your ID during review.",
    permissionNote: CAMERA_CAPTURE_COPY.permissionLead,
    openCameraAriaLabel: "Open front camera for selfie verification",
    retakeAriaLabel: "Retake selfie photo",
    allowCameraSwitch: false,
    facingMode: "user",
    facingHint: "Uses your front camera.",
  };
}

/** Flip/switch controls only apply while an in-page preview is visible (after capture). */
export function shouldShowFlipCameraControl(input: {
  capturedPreview: string | null | undefined;
  allowCameraSwitch: boolean;
}): boolean {
  return Boolean(input.capturedPreview) && input.allowCameraSwitch;
}

export function cameraSwitchLabel(currentFacing: "user" | "environment"): string {
  return currentFacing === "user"
    ? "Use rear camera for next retake"
    : "Use front camera for next retake";
}

export function flipCameraAriaLabel(currentFacing: "user" | "environment"): string {
  return currentFacing === "user"
    ? "Switch to rear camera for next retake"
    : "Switch to front camera for next retake";
}

export function identityCaptureStepIntro(step: IdentityCameraCaptureKind): string {
  return step === "id_front"
    ? "Step 2 of 4 — allow camera access, then photograph the front of your ID."
    : "Step 3 of 4 — allow camera access, then take a selfie.";
}
