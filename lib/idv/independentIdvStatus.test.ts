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
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    delete process.env.ABRAXAS_DATABASE_URL;
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

  it("accepts postgres_direct persistence without Supabase for core partial status", async () => {
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = "postgresql://127.0.0.1:5432/abraxas_test";
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = "/tmp/evidence";
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    vi.doMock("@/lib/persistence/idvDirectStore", () => ({
      countPendingIdentityReviewQueueDirect: async () => 3,
    }));

    const { getIndependentIdvStatus } = await import("./independentIdvStatus");
    const status = await getIndependentIdvStatus();

    expect(status.postgres_direct_configured).toBe(true);
    expect(status.supabase_configured).toBe(false);
    expect(status.status).toBe("partial");
    expect(status.pending_review_count).toBe(3);
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
