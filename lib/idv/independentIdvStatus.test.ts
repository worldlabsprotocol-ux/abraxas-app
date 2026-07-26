import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("getIndependentIdvStatus", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
    process.env.IDV_PROVIDER = "manual";
    process.env.ABRAXAS_SIGNING_KEY = '{"kty":"OKP","crv":"Ed25519","d":"test","x":"test"}';
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  afterEach(() => {
    process.env = env;
    vi.restoreAllMocks();
  });

  it("reports partial when signing and supabase are set but sponsor is missing", async () => {
    vi.doMock("@/lib/decisionReceipts/signing", () => ({
      loadReceiptSigningKey: () => ({ kty: "OKP" }),
    }));
    vi.doMock("@/lib/sui/passportIssuer", () => ({
      isPassportIssuerConfigured: () => false,
      getSponsorConfig: () => ({ configured: false, cap_from_env: false }),
    }));
    vi.doMock("@/lib/sui/config", () => ({
      getActiveSuiNetwork: () => "devnet",
      isSuiMainnetDeployed: () => false,
      resolveSuiDeployment: () => ({
        deployment: { packageId: "0xabc" },
        mainnetPackageMissing: true,
      }),
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ count: 2, error: null }),
            }),
          }),
        }),
      }),
    }));

    const { getIndependentIdvStatus } = await import("./independentIdvStatus");
    const status = await getIndependentIdvStatus();

    expect(status.abraxas_independent).toBe(true);
    expect(status.status).toBe("partial");
    expect(status.pending_review_count).toBe(2);
    expect(status.blockers.some((b) => b.includes("SUI_SPONSOR"))).toBe(true);
  });

  it("reports not_configured when Veriff is active", async () => {
    process.env.IDV_PROVIDER = "veriff";
    process.env.VERIFF_API_KEY = "live-key";

    vi.doMock("@/lib/decisionReceipts/signing", () => ({
      loadReceiptSigningKey: () => null,
    }));
    vi.doMock("@/lib/sui/passportIssuer", () => ({
      isPassportIssuerConfigured: () => false,
      getSponsorConfig: () => ({ configured: false, cap_from_env: false }),
    }));
    vi.doMock("@/lib/sui/config", () => ({
      getActiveSuiNetwork: () => "devnet",
      isSuiMainnetDeployed: () => false,
      resolveSuiDeployment: () => ({
        deployment: { packageId: "" },
        mainnetPackageMissing: true,
      }),
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ count: 0, error: null }),
            }),
          }),
        }),
      }),
    }));

    const { getIndependentIdvStatus } = await import("./independentIdvStatus");
    const status = await getIndependentIdvStatus();

    expect(status.abraxas_independent).toBe(false);
    expect(status.blockers[0]).toContain("capture disabled");
  });
});
