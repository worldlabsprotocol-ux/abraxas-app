// FILE: lib/idv/biometric/capturePolicyPipeline.test.ts
// Proves partner policy rules change capture-time assessment output.

import { describe, expect, it } from "vitest";
import { analyzeBiometricCapture } from "./analyzeCapture";
import { GOOD_TROUBLE_BIOMETRIC_THRESHOLDS } from "@/lib/goodTrouble/biometricPolicy";
import { matchingSelfie, noisyPassportLikeId } from "./syntheticFixtures";

const SESSION = "policy-pipeline-test";
const WALLET = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";

describe("capture policy pipeline", () => {
  it("applies partner policy at analyze time and stamps threshold source", async () => {
    const id = await noisyPassportLikeId();
    const selfie = await matchingSelfie();

    const global = await analyzeBiometricCapture({
      captureSessionId: `${SESSION}-global`,
      suiAddress: WALLET,
      idFrontBuffer: id,
      selfieBuffer: selfie,
    });

    const partner = await analyzeBiometricCapture({
      captureSessionId: `${SESSION}-partner`,
      suiAddress: WALLET,
      idFrontBuffer: id,
      selfieBuffer: selfie,
      partnerId: "good-trouble-cannabis",
      policyRules: { biometric_thresholds: GOOD_TROUBLE_BIOMETRIC_THRESHOLDS },
    });

    expect(global.signals.threshold_policy_source).toBe("global");
    expect(partner.signals.threshold_policy_source).toBe("partner");
    expect(partner.signals.partner_id).toBe("good-trouble-cannabis");
    expect(partner.signals.face_match_method).toMatch(/onnx_embedding|correlation/);
    expect(Array.isArray(partner.reason_codes)).toBe(true);

    if (global.decision !== "reject" && partner.decision === "reject") {
      expect(partner.reason_codes.length).toBeGreaterThan(0);
    }
  });
});
