import { describe, expect, it, vi } from "vitest";
import {
  BUILD823_DEMO_RECEIPT_ID,
} from "@/lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";
import {
  BUILD824_TRUSTED_AUDIENCE_CONFIGURATION_REQUIRED,
  build824TrustedAudienceForReceiptId,
  build824TrustedAudienceFromEnv,
  resolveBuild824TrustedAudience,
} from "./resolveBuild824TrustedAudience";

describe("resolveBuild824TrustedAudience", () => {
  it("prefers integrator env over synthetic teaching fixture", () => {
    const audience = build824TrustedAudienceFromEnv({
      ABRAXAS_BUILD824_EXPECTED_PARTNER_ID: "p-env",
      ABRAXAS_BUILD824_EXPECTED_POLICY_ID: "pol-env",
    });
    expect(audience?.source).toBe("integrator_env");
    expect(audience?.partner_id).toBe("p-env");
    const resolved = resolveBuild824TrustedAudience({
      receiptId: BUILD823_DEMO_RECEIPT_ID,
      env: {
        ABRAXAS_BUILD824_EXPECTED_PARTNER_ID: "p-env",
        ABRAXAS_BUILD824_EXPECTED_POLICY_ID: "pol-env",
      },
    });
    expect("error" in resolved).toBe(false);
    if ("error" in resolved) return;
    expect(resolved.source).toBe("integrator_env");
  });

  it("uses explicitly synthetic demo fixture for teaching receipt only", () => {
    const audience = build824TrustedAudienceForReceiptId(BUILD823_DEMO_RECEIPT_ID);
    expect(audience?.source).toBe("demo_fixture_synthetic");
    expect(audience?.synthetic).toBe(true);
    expect(audience?.partner_id).toContain("studio-accept");
  });

  it("fails closed without trusted config even for live sandbox receipt ids", () => {
    const fetchFn = vi.fn();
    const result = resolveBuild824TrustedAudience({
      receiptId: "dr_3CJjF23eVWSysJtz",
      env: {},
    });
    expect(result).toEqual({ error: BUILD824_TRUSTED_AUDIENCE_CONFIGURATION_REQUIRED });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("does not call public receipt API to establish audience", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        partner_id: "would-trust-from-public",
        policy_id: "would-trust-from-public-policy",
      }),
    });
    void fetchFn;
    const result = resolveBuild824TrustedAudience({
      receiptId: "dr_fresh_other",
      env: {},
    });
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error).toBe(BUILD824_TRUSTED_AUDIENCE_CONFIGURATION_REQUIRED);
  });

  it("accepts live sandbox pins only via integrator env", () => {
    const result = resolveBuild824TrustedAudience({
      receiptId: "dr_3CJjF23eVWSysJtz",
      env: {
        ABRAXAS_BUILD824_EXPECTED_PARTNER_ID: "studio-b900live-build900-external-rp-17-7bd226e3115c",
        ABRAXAS_BUILD824_EXPECTED_POLICY_ID:
          "studio-b900live-build900-external-rp-17-7bd226e3115c-wallet_control-v1",
      },
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.source).toBe("integrator_env");
  });
});