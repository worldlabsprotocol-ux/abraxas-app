// FILE: lib/integrations/designPartnerIntakeHealth.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  buildDesignPartnerIntakeHealthReport,
  evaluateProductionIntakeRateLimitReady,
} from "./designPartnerIntakeHealth";
import {
  DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER,
  MIGRATION_071_OPERATOR_ATTESTATION,
  resolveOverallStatus,
} from "@/lib/admin/designPartnerIntakeHealthContract";
import { checkDesignPartnerApplyRateLimit } from "./designPartnerApplicationRateLimit";

const STRONG_SECRET = "design-partner-rate-limit-secret-32";
const EXAMPLE_UPSTASH_URL = "https://example.upstash.io";

const loadReceiptSigningKeyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/decisionReceipts/signing", () => ({
  loadReceiptSigningKey: () => loadReceiptSigningKeyMock(),
}));

const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: maybeSingleMock,
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    return { from: vi.fn(() => chain) };
  }),
}));

import { GET as intakeHealthGET } from "@/app/api/admin/design-partners/intake-health/route";
import { SITE_URL } from "@/lib/siteUrl";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function productionEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_ENABLED", "true");
  vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_SALT", STRONG_SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", EXAMPLE_UPSTASH_URL);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("ADMIN_EMAIL", "ops@example.com");
  vi.stubEnv("ABRAXAS_SIGNING_KEY", JSON.stringify({ kty: "OKP", crv: "Ed25519", d: "abc", x: "def" }));
}

function checkStatus(
  report: ReturnType<typeof buildDesignPartnerIntakeHealthReport>,
  key: (typeof DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER)[number],
) {
  return report.checks.find((entry) => entry.key === key)?.status;
}

describe("designPartnerIntakeHealth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    loadReceiptSigningKeyMock.mockReturnValue({ signingKeyId: "test" });
    resolveBrowserSessionMock.mockResolvedValue(null);
    maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports ready when production prerequisites are satisfied", () => {
    productionEnv();
    const report = buildDesignPartnerIntakeHealthReport();
    expect(report.overall_status).toBe("ready");
    expect(checkStatus(report, "production_intake_rate_limit_ready")).toBe("pass");
    expect(resolveOverallStatus(report)).toBe("ready");
  });

  it("fails production_intake_rate_limit_ready when production rate limiting is disabled", () => {
    productionEnv();
    vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_ENABLED", "false");
    const report = buildDesignPartnerIntakeHealthReport();
    expect(checkStatus(report, "rate_limiting_enabled")).toBe("fail");
    expect(checkStatus(report, "production_intake_rate_limit_ready")).toBe("fail");
    expect(report.overall_status).toBe("misconfigured");
  });

  it("reports misconfigured when supabase configuration is missing", () => {
    productionEnv();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const report = buildDesignPartnerIntakeHealthReport();
    expect(checkStatus(report, "intake_route_configured")).toBe("fail");
    expect(report.overall_status).toBe("misconfigured");
  });

  it("reports degraded outside production when rate limiting is disabled", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    const report = buildDesignPartnerIntakeHealthReport();
    expect(report.runtime_environment).toBe("non_production");
    expect(checkStatus(report, "production_intake_rate_limit_ready")).toBe("pass");
    expect(report.overall_status).toBe("degraded");
  });

  it("reports degraded when operator notification env is missing", () => {
    productionEnv();
    delete process.env.RESEND_API_KEY;
    const report = buildDesignPartnerIntakeHealthReport();
    expect(report.overall_status).toBe("degraded");
  });

  it("reports degraded when proof signing key is missing", () => {
    productionEnv();
    loadReceiptSigningKeyMock.mockReturnValue(null);
    const report = buildDesignPartnerIntakeHealthReport();
    expect(checkStatus(report, "proof_signing_configured")).toBe("fail");
    expect(report.overall_status).toBe("degraded");
  });

  it("reports proof_signing_configured fail without throwing when signing key load throws", () => {
    productionEnv();
    loadReceiptSigningKeyMock.mockImplementation(() => {
      throw new Error("malformed signing key");
    });
    const report = buildDesignPartnerIntakeHealthReport();
    expect(checkStatus(report, "proof_signing_configured")).toBe("fail");
    expect(report.overall_status).toBe("degraded");
  });

  it("keeps migration 071 runtime status unknown", () => {
    productionEnv();
    const report = buildDesignPartnerIntakeHealthReport();
    expect(report.operator_attestation.migration_071).toEqual(MIGRATION_071_OPERATOR_ATTESTATION);
  });

  it("matches production intake rate-limit prerequisite matrix", async () => {
    const cases = [
      {
        name: "distributed_unavailable",
        setup: () => {
          productionEnv();
          delete process.env.UPSTASH_REDIS_REST_URL;
          delete process.env.UPSTASH_REDIS_REST_TOKEN;
        },
        expectedBackend: "distributed_unavailable",
      },
      {
        name: "distributed_config_incomplete",
        setup: () => {
          productionEnv();
          vi.stubEnv("UPSTASH_REDIS_REST_URL", EXAMPLE_UPSTASH_URL);
          delete process.env.UPSTASH_REDIS_REST_TOKEN;
        },
        expectedBackend: "distributed_config_incomplete",
      },
      {
        name: "identity_unavailable",
        setup: () => {
          productionEnv();
          delete process.env.PARTNER_FLOW_RATE_LIMIT_SALT;
          delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
          delete process.env.ABRAXAS_SIGNING_KEY;
        },
        expectedBackend: "identity_unavailable",
      },
    ] as const;

    for (const testCase of cases) {
      vi.unstubAllEnvs();
      testCase.setup();
      const report = buildDesignPartnerIntakeHealthReport();
      expect(checkStatus(report, "production_intake_rate_limit_ready"), testCase.name).toBe("fail");
      expect(report.overall_status, testCase.name).toBe("misconfigured");

      const req = new NextRequest("http://localhost/api/integrations/apply", {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.10" },
      });
      const rate = await checkDesignPartnerApplyRateLimit(req);
      expect(rate.allowed, testCase.name).toBe(false);
      expect(rate.backend, testCase.name).toBe(testCase.expectedBackend);
    }
  });

  it("treats production disabled rate limiting as misconfigured even though backend is disabled", async () => {
    productionEnv();
    vi.stubEnv("PARTNER_FLOW_RATE_LIMIT_ENABLED", "false");
    const report = buildDesignPartnerIntakeHealthReport();
    expect(checkStatus(report, "production_intake_rate_limit_ready")).toBe("fail");
    expect(report.overall_status).toBe("misconfigured");

    const req = new NextRequest("http://localhost/api/integrations/apply", { method: "POST" });
    const rate = await checkDesignPartnerApplyRateLimit(req);
    expect(rate.backend).toBe("disabled");
    expect(rate.allowed).toBe(true);
  });

  it("serializes only allowlisted health data without sensitive values", () => {
    productionEnv();
    const report = buildDesignPartnerIntakeHealthReport();
    const serialized = JSON.stringify(report);
    expect(serialized).toContain("upstash_configuration_present");
    expect(serialized).not.toContain(STRONG_SECRET);
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("service-role-key");
    expect(serialized).not.toContain("re_test");
    expect(serialized).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]+/);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
  });
});

describe("evaluateProductionIntakeRateLimitReady", () => {
  it("fails on production when rate limiting is disabled", () => {
    expect(evaluateProductionIntakeRateLimitReady({
      runtimeEnvironment: "production",
      rateLimitingEnabled: false,
      hmacConfigured: true,
      upstashState: "complete",
    })).toBe("fail");
  });
});

describe("design-partner intake health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productionEnv();
    loadReceiptSigningKeyMock.mockReturnValue({ signingKeyId: "test" });
    resolveBrowserSessionMock.mockResolvedValue(null);
    maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 for PIN-only requests on Production origin", async () => {
    const req = new NextRequest("http://localhost/api/admin/design-partners/intake-health", {
      headers: { "x-admin-pin": "test-admin-pin" },
    });
    const res = await intakeHealthGET(req);
    expect(res.status).toBe(401);
  });

  it("allows allowlisted browser session on Production origin", async () => {
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/design-partners/intake-health", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    const res = await intakeHealthGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overall_status).toBe("ready");
  });
});
