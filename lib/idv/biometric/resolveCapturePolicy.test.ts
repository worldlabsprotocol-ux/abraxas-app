// FILE: lib/idv/biometric/resolveCapturePolicy.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCaptureBiometricPolicy } from "./resolveCapturePolicy";
import { GOOD_TROUBLE_BIOMETRIC_THRESHOLDS } from "@/lib/goodTrouble/biometricPolicy";

const getPolicy = vi.fn();

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => getPolicy(...args),
}));

function mockSupabase(row: { partner_id: string; policy_id: string } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("resolveCaptureBiometricPolicy", () => {
  beforeEach(() => {
    getPolicy.mockReset();
  });

  it("loads partner rules from verification_request_id", async () => {
    getPolicy.mockResolvedValue({
      partner_id: "good-trouble-cannabis",
      rules_json: { biometric_thresholds: GOOD_TROUBLE_BIOMETRIC_THRESHOLDS },
    });

    const result = await resolveCaptureBiometricPolicy(
      mockSupabase({ partner_id: "good-trouble-cannabis", policy_id: "good-trouble-retail-v1" }),
      { verificationRequestId: "vr-abc-123" },
    );

    expect(result.policyId).toBe("good-trouble-retail-v1");
    expect(result.partnerId).toBe("good-trouble-cannabis");
    expect(result.policyRules?.biometric_thresholds?.face_min).toBe(0.90);
    expect(getPolicy).toHaveBeenCalledWith("good-trouble-retail-v1");
  });

  it("falls back to direct policy_id when verification request is absent", async () => {
    getPolicy.mockResolvedValue({
      partner_id: "good-trouble-cannabis",
      rules_json: { biometric_thresholds: { face_min: 0.55 } },
    });

    const result = await resolveCaptureBiometricPolicy(mockSupabase(null), {
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
    });

    expect(result.policyId).toBe("good-trouble-retail-v1");
    expect(result.policyRules?.biometric_thresholds?.face_min).toBe(0.55);
  });

  it("returns empty context when no policy identifiers are provided", async () => {
    const result = await resolveCaptureBiometricPolicy(mockSupabase(null), {});
    expect(result).toEqual({});
    expect(getPolicy).not.toHaveBeenCalled();
  });
});
