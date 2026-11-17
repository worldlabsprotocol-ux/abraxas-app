import { describe, expect, it, vi } from "vitest";
import {
  BUILD823_DEMO_RECEIPT_ID,
} from "@/lib/partner/portableIndependentVerification/fixtures/build823DemoReceipt.fixture";
import {
  build824TrustedAudienceForReceiptId,
  build824TrustedAudienceFromEnv,
  build824TrustedAudienceFromPublicReceipt,
  resolveBuild824TrustedAudience,
} from "./resolveBuild824TrustedAudience";

describe("resolveBuild824TrustedAudience", () => {
  it("prefers integrator env over fixture and public API", () => {
    const audience = build824TrustedAudienceFromEnv({
      ABRAXAS_BUILD824_EXPECTED_PARTNER_ID: "p-env",
      ABRAXAS_BUILD824_EXPECTED_POLICY_ID: "pol-env",
    });
    expect(audience?.source).toBe("integrator_env");
    expect(audience?.partner_id).toBe("p-env");
  });

  it("uses demo fixture for teaching receipt", () => {
    const audience = build824TrustedAudienceForReceiptId(BUILD823_DEMO_RECEIPT_ID);
    expect(audience?.source).toBe("demo_fixture");
    expect(audience?.partner_id).toContain("studio-accept");
  });

  it("loads audience from public receipt API when env unset", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        partner_id: "studio-fresh-partner",
        policy_id: "studio-fresh-policy",
      }),
    });
    const audience = await resolveBuild824TrustedAudience({
      demoBase: "https://demo.example",
      receiptId: "dr_fresh_other",
      env: {},
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect("error" in audience).toBe(false);
    if ("error" in audience) return;
    expect(audience.source).toBe("public_receipt_api");
    expect(audience.partner_id).toBe("studio-fresh-partner");
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("/public"),
      expect.any(Object),
    );
  });

  it("fails closed when public receipt lacks audience", () => {
    const result = build824TrustedAudienceFromPublicReceipt({ partner_id: null });
    expect(result).toEqual({ error: "public_receipt_audience_unavailable" });
  });
});