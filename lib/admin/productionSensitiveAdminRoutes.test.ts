// FILE: lib/admin/productionSensitiveAdminRoutes.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";

const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => {
    const chain: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      maybeSingle: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: maybeSingleMock,
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.limit.mockResolvedValue({ data: [], error: null });
    return { from: vi.fn(() => chain) };
  }),
}));

import { GET as partnerKeysGET } from "@/app/api/admin/partner-keys/route";
import { GET as webhookObservabilityGET } from "@/app/api/admin/partners/webhooks/observability/route";

vi.mock("@/lib/partner/webhooks/webhookOperatorObservability", () => ({
  getPartnerWebhookObservability: vi.fn().mockResolvedValue({
    partner_id: "partner-a",
    webhook_configured: true,
    webhook_delivery_enabled: true,
    status_counts: {
      pending: 0,
      delivering: 0,
      retrying: 0,
      delivered: 0,
      failed: 0,
      unknown: 0,
    },
    dispatch_summary_available: false,
    follow_up: { recommended: false, reasons: [] },
    deliveries: [],
    disclaimer: "Queued, delivering, or retrying does not mean delivered.",
  }),
  getPartnerWebhookDeliveryAttempts: vi.fn(),
  validateObservabilityPartnerId: (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, error: "partner_id_required" };
    return { ok: true, value: trimmed };
  },
  validateObservabilityEventId: vi.fn(),
}));

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function productionEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
}

function demoEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
}

describe("production-sensitive admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBrowserSessionMock.mockResolvedValue(null);
    maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 for PIN-only requests on Production origin", async () => {
    productionEnv();
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { "x-admin-pin": "test-admin-pin" },
    });
    const res = await partnerKeysGET(req);
    expect(res.status).toBe(401);
  });

  it("allows allowlisted browser session on Production origin", async () => {
    productionEnv();
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    const res = await partnerKeysGET(req);
    expect(res.status).not.toBe(401);
    const body = await res.json() as { error?: string };
    expect(body.error).not.toBe("Unauthorized");
  });

  it("allows allowlisted session when x-admin-pin header is also present", async () => {
    productionEnv();
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: {
        cookie: "abraxas_browser_session=test-token",
        "x-admin-pin": "test-admin-pin",
      },
    });
    const res = await partnerKeysGET(req);
    expect(res.status).not.toBe(401);
    const body = await res.json() as { error?: string };
    expect(body.error).not.toBe("Unauthorized");
  });

  it("returns 401 for non-allowlisted browser session on Production origin", async () => {
    productionEnv();
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    maybeSingleMock.mockResolvedValue({ data: { email: "other@example.com" } });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    const res = await partnerKeysGET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when allowlist is empty on Production origin", async () => {
    productionEnv();
    vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "");
    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { cookie: "abraxas_browser_session=test-token" },
    });
    const res = await partnerKeysGET(req);
    expect(res.status).toBe(401);
  });

  it("preserves PIN-based access on Demo origin", async () => {
    demoEnv();
    const req = new NextRequest("http://localhost/api/admin/partner-keys", {
      headers: { "x-admin-pin": "test-admin-pin" },
    });
    const res = await partnerKeysGET(req);
    expect(res.status).not.toBe(401);
  });

  it("leaves demo sandbox guard on PIN-based checkAdmin only", () => {
    const source = readFileSync(
      resolve(__dirname, "../demo/partnerSandboxDemoRouteGuard.ts"),
      "utf8",
    );
    expect(source).toContain("checkAdmin");
    expect(source).not.toContain("checkProductionSensitiveAdminAccess");
  });

  describe("webhook observability route", () => {
    it("returns 401 for PIN-only requests on Production origin", async () => {
      productionEnv();
      const req = new NextRequest(
        "http://localhost/api/admin/partners/webhooks/observability?partner_id=partner-a",
        { headers: { "x-admin-pin": "test-admin-pin" } },
      );
      const res = await webhookObservabilityGET(req);
      expect(res.status).toBe(401);
    });

    it("allows allowlisted browser session on Production origin", async () => {
      productionEnv();
      resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
      const req = new NextRequest(
        "http://localhost/api/admin/partners/webhooks/observability?partner_id=partner-a",
        { headers: { cookie: "abraxas_browser_session=test-token" } },
      );
      const res = await webhookObservabilityGET(req);
      expect(res.status).not.toBe(401);
      const body = await res.json() as { error?: string };
      expect(body.error).not.toBe("Unauthorized");
    });
  });
});
