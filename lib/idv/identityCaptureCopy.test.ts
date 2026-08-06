import { describe, expect, it } from "vitest";
import {
  CAMERA_CAPTURE_COPY,
  cameraSwitchLabel,
  flipCameraAriaLabel,
  identityCameraCaptureCopy,
  identityCaptureStepIntro,
  shouldShowFlipCameraControl,
} from "@/lib/idv/identityCaptureCopy";

describe("identityCameraCaptureCopy", () => {
  it("uses Open camera language and front-side ID instructions for document capture", () => {
    const copy = identityCameraCaptureCopy("id_front");
    expect(copy.label).toContain("front side");
    expect(copy.hint).toContain("front of your");
    expect(copy.hint).toContain("do not need to photograph the back");
    expect(copy.permissionNote).toContain("Allow camera access");
    expect(copy.openCameraAriaLabel).toContain("front");
    expect(copy.allowCameraSwitch).toBe(true);
    expect(copy.facingMode).toBe("environment");
  });

  it("uses front-camera selfie copy without camera switch", () => {
    const copy = identityCameraCaptureCopy("selfie");
    expect(copy.label).toContain("Selfie");
    expect(copy.hint).toContain("front camera");
    expect(copy.allowCameraSwitch).toBe(false);
    expect(copy.facingMode).toBe("user");
  });

  it("preserves blur and quality guidance in shared reminder", () => {
    expect(CAMERA_CAPTURE_COPY.qualityReminder).toMatch(/blur/i);
    expect(CAMERA_CAPTURE_COPY.qualityReminder).toMatch(/lighting/i);
  });
});

describe("shouldShowFlipCameraControl", () => {
  it("hides flip before a photo preview exists", () => {
    expect(
      shouldShowFlipCameraControl({ capturedPreview: null, allowCameraSwitch: true }),
    ).toBe(false);
  });

  it("shows flip only with preview and when camera switch is allowed", () => {
    expect(
      shouldShowFlipCameraControl({ capturedPreview: "blob:preview", allowCameraSwitch: true }),
    ).toBe(true);
    expect(
      shouldShowFlipCameraControl({ capturedPreview: "blob:preview", allowCameraSwitch: false }),
    ).toBe(false);
  });
});

describe("camera switch labels", () => {
  it("describes next retake camera without flip-back confusion", () => {
    expect(cameraSwitchLabel("environment")).toContain("front camera");
    expect(cameraSwitchLabel("user")).toContain("rear camera");
    expect(flipCameraAriaLabel("environment")).toContain("front camera");
  });
});

describe("identityCaptureStepIntro", () => {
  it("explains camera permission before capture on step 2", () => {
    expect(identityCaptureStepIntro("id_front")).toContain("allow camera access");
    expect(identityCaptureStepIntro("id_front")).toContain("Step 2 of 4");
  });
});
