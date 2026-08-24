import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/siteUrl";

const checkProductionSensitiveAdminAccessMock = vi.fn();
const listReceiptsMock = vi.fn();
const resolveBrowserSessionMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookSandboxTestReceiver", () => ({
  listSandboxTestReceiptsForPartner: (...args: unknown[]) => listReceiptsMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookOperatorObservability", () => ({
  validateObservabilityPartnerId: (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, error: "partner_id_required" };
    return { ok: true, value: trimmed };
  },
}));

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => resolveBrowserSessionMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
    };
    return { from: vi.fn(() => chain) };
  }),
}));

import { GET } from "@/app/api/admin/partners/webhooks/sandbox-receipts/route";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function productionEnv(): void {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ABRAXAS_ADMIN_EMAILS", "ops@example.com");
  vi.stubEnv("ADMIN_PIN", "test-admin-pin");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
}

describe("admin sandbox receipts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    listReceiptsMock.mockResolvedValue([
      {
        event_id: "evt-test-1",
        partner_id: "partner-sandbox",
        event_type: "partner.webhook.test",
        received_at: "2026-08-08T00:00:05.000Z",
      },
    ]);
    resolveBrowserSessionMock.mockResolvedValue(null);
    maybeSingleMock.mockResolvedValue({ data: { email: "ops@example.com" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when admin access is denied", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(false);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/partners/webhooks/sandbox-receipts?partner_id=partner-sandbox"),
    );

    expect(res.status).toBe(401);
    expect(listReceiptsMock).not.toHaveBeenCalled();
  });

  it("returns 400 without partner_id", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/partners/webhooks/sandbox-receipts"));
    expect(res.status).toBe(400);
    expect(listReceiptsMock).not.toHaveBeenCalled();
  });

  it("returns partner-safe receipt metadata without forbidden fields", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/admin/partners/webhooks/sandbox-receipts?partner_id=partner-sandbox"),
    );
    const body = await res.json() as { ok: boolean; receipts: Array<{ event_id: string }> };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.receipts[0]?.event_id).toBe("evt-test-1");

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("endpoint_url");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("payload");
    expect(serialized).not.toContain("response_snippet");
    expect(serialized).not.toContain("CRON_SECRET");
    expect(serialized).not.toContain("SQLSTATE");
    expect(serialized).not.toContain("stack");
  });

  it("returns 503 when receipts are unavailable", async () => {
    listReceiptsMock.mockResolvedValue(null);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/partners/webhooks/sandbox-receipts?partner_id=partner-sandbox"),
    );
    const body = await res.json() as { error: string };

    expect(res.status).toBe(503);
    expect(body.error).toBe("Receipts unavailable");
  });

  it("returns 401 for PIN-only requests on Production origin", async () => {
    productionEnv();
    const { checkProductionSensitiveAdminAccess } = await vi.importActual<typeof import("@/lib/adminAuth")>(
      "@/lib/adminAuth",
    );
    checkProductionSensitiveAdminAccessMock.mockImplementation(checkProductionSensitiveAdminAccess);

    const res = await GET(
      new NextRequest(
        "http://localhost/api/admin/partners/webhooks/sandbox-receipts?partner_id=partner-sandbox",
        { headers: { "x-admin-pin": "test-admin-pin" } },
      ),
    );

    expect(res.status).toBe(401);
    expect(listReceiptsMock).not.toHaveBeenCalled();
  });

  it("allows allowlisted browser session on Production origin", async () => {
    productionEnv();
    const { checkProductionSensitiveAdminAccess } = await vi.importActual<typeof import("@/lib/adminAuth")>(
      "@/lib/adminAuth",
    );
    checkProductionSensitiveAdminAccessMock.mockImplementation(checkProductionSensitiveAdminAccess);

    resolveBrowserSessionMock.mockResolvedValue({ suiAddress: SUI });
    const res = await GET(
      new NextRequest(
        "http://localhost/api/admin/partners/webhooks/sandbox-receipts?partner_id=partner-sandbox",
        { headers: { cookie: "abraxas_browser_session=test-token" } },
      ),
    );

    expect(res.status).not.toBe(401);
    const body = await res.json() as { error?: string };
    expect(body.error).not.toBe("Unauthorized");
  });
});
