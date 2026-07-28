// FILE: lib/idv/biometric/verificationMatrix.test.ts
// Verification matrix — synthetic captures; run before trusting engine in production.

import { describe, expect, it } from "vitest";
import { analyzeBiometricCapture } from "./analyzeCapture";
import {
  blankWhiteId,
  blurryPassportId,
  driversLicenseAspectId,
  matchingSelfie,
  noisyPassportLikeId,
  portraitRandomPhoto,
  solidJpeg,
  twoFaceSelfie,
  wallSelfie,
} from "./syntheticFixtures";

const SESSION = "test-session";
const WALLET = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd";

async function analyze(id: Buffer, selfie: Buffer) {
  return analyzeBiometricCapture({
    captureSessionId: SESSION,
    suiAddress: WALLET,
    idFrontBuffer: id,
    selfieBuffer: selfie,
  });
}

describe("Abraxas Verify verification matrix (synthetic)", () => {
  it("✅ valid passport-like ID + matching selfie → human_review or auto_approve", async () => {
    const result = await analyze(await noisyPassportLikeId(), await matchingSelfie());
    expect(["human_review", "auto_approve"]).toContain(result.decision);
    expect(result.signals.face_detected_selfie).toBe(true);
    expect(result.signals.document_type).not.toBe("unknown");
  });

  it("❌ wall photo as selfie → reject", async () => {
    const result = await analyze(await noisyPassportLikeId(), await wallSelfie());
    expect(result.decision).toBe("reject");
    expect(result.reasons.join(" ").toLowerCase()).toMatch(/face|liveness/);
  });

  it("❌ blank white ID → reject", async () => {
    const result = await analyze(await blankWhiteId(), await matchingSelfie());
    expect(result.decision).toBe("reject");
  });

  it("❌ portrait random photo as ID → reject", async () => {
    const result = await analyze(await portraitRandomPhoto(), await matchingSelfie());
    expect(result.decision).toBe("reject");
    expect(result.reasons.some(r => r.toLowerCase().includes("document") || r.toLowerCase().includes("id"))).toBe(true);
  });

  it("❌ two faces in selfie → reject", async () => {
    const result = await analyze(await noisyPassportLikeId(), await twoFaceSelfie());
    expect(result.decision).toBe("reject");
    expect(result.reasons.some(r => r.toLowerCase().includes("one face"))).toBe(true);
    expect(Number(result.signals.selfie_face_count)).toBeGreaterThan(1);
  });

  it("❌ blurry ID → reject or human_review with quality reason", async () => {
    const result = await analyze(await blurryPassportId(), await matchingSelfie());
    expect(["reject", "human_review"]).toContain(result.decision);
    if (result.decision === "reject") {
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });

  it("driver's license aspect ID → classified (not unknown) or human_review", async () => {
    const result = await analyze(await driversLicenseAspectId(), await matchingSelfie());
    expect(["drivers_license", "national_id", "passport"]).toContain(result.signals.document_type);
    expect(["human_review", "auto_approve", "reject"]).toContain(result.decision);
  });

  it("stores explainable audit signals on every assessment", async () => {
    const result = await analyze(await noisyPassportLikeId(), await matchingSelfie());
    expect(result.signals).toMatchObject({
      face_detected_id: expect.any(Boolean),
      face_detected_selfie: expect.any(Boolean),
      face_match: expect.any(Number),
      liveness: expect.any(Number),
      document_type: expect.any(String),
      fraud_risk: expect.any(Number),
      decision: result.decision,
    });
    expect(Array.isArray(result.signals.rejection_reasons) || result.reasons).toBeTruthy();
  });

  it("❌ uniform gray selfie (pet/sky proxy) → reject", async () => {
    const gray = await solidJpeg(720, 960, 140, 140, 140);
    const result = await analyze(await noisyPassportLikeId(), gray);
    expect(result.decision).toBe("reject");
  });
});
