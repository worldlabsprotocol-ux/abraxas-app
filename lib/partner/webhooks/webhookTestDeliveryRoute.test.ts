import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authenticatePartnerMock = vi.fn();
const getReadinessMock = vi.fn();
const enqueueMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookOperatorReadiness", () => ({
  getWebhookTestDeliveryReadiness: (...args: unknown[]) => getReadinessMock(...args),
  isSandboxPartnerApiKey: (prefix: string) => prefix.startsWith("abx_test_"),
  partnerHasWebhooksReadScope: (scopes: readonly string[]) => scopes.includes("webhooks:read"),
}));

vi.mock("@/lib/partner/webhooks/webhookTestDelivery", () => ({
  enqueuePartnerWebhookTestDelivery: (...args: unknown[]) => enqueueMock(...args),
}));

import { POST } from "@/app/api/partner/webhooks/test-delivery/route";

const readyState = {
  webhook_schema_062_ready: true,
  webhook_schema_063_ready: true,
  webhook_test_events_supported: true,
  webhook_delivery_enabled: true,
  webhook_dispatch_configured: true,
  webhook_signing_capable: true,
  test_delivery_available: true,
};

const authCtx = {
  partnerId: "partner-a",
  apiKeyId: "key-1",
  displayName: "Partner A",
  keyPrefix: "abx_test_abc",
  scopes: ["webhooks:read"],
};

describe("partner webhook test-delivery API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReadinessMock.mockResolvedValue(readyState);
  });

  it("returns 401 when no API key is provided", async () => {
    authenticatePartnerMock.mockResolvedValue(null);

    const res = await POST(new NextRequest("http://localhost/api/partner/webhooks/test-delivery", { method: "POST" }));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe("API key required");
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 403 for abx_live_ keys", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: { ...authCtx, keyPrefix: "abx_live_abc" },
    });

    const res = await POST(new NextRequest("http://localhost/api/partner/webhooks/test-delivery", { method: "POST" }));
    expect(res.status).toBe(403);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 403 when webhooks:read scope is missing", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: { ...authCtx, scopes: ["verify:credential"] },
    });

    const res = await POST(new NextRequest("http://localhost/api/partner/webhooks/test-delivery", { method: "POST" }));
    expect(res.status).toBe(403);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 503 when operational readiness is unavailable", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });
    getReadinessMock.mockResolvedValue({
      ...readyState,
      webhook_dispatch_configured: false,
      test_delivery_available: false,
    });

    const res = await POST(new NextRequest("http://localhost/api/partner/webhooks/test-delivery", { method: "POST" }));
    const body = await res.json() as { code: string };

    expect(res.status).toBe(503);
    expect(body.code).toBe("test_delivery_unavailable");
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns queued: true and makes one enqueue RPC call for the authenticated partner", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });
    enqueueMock.mockResolvedValue({ ok: true, queued: true, eventId: "evt-queued-1" });

    const res = await POST(
      new NextRequest("http://localhost/api/partner/webhooks/test-delivery?partner_id=partner-b", {
        method: "POST",
        headers: { Authorization: "Bearer abx_test_secret" },
      }),
    );
    const body = await res.json() as { ok: boolean; queued: boolean; event_id: string; delivered?: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.queued).toBe(true);
    expect(body.event_id).toBe("evt-queued-1");
    expect(body.delivered).toBeUndefined();
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith("partner-a");
    expect(getReadinessMock).toHaveBeenCalledWith("partner-a");
  });

  it("returns 429 when the atomic RPC reports rate_limited", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });
    enqueueMock.mockResolvedValue({ ok: false, code: "rate_limited", retryAfterSec: 30 });

    const res = await POST(new NextRequest("http://localhost/api/partner/webhooks/test-delivery", { method: "POST" }));
    const body = await res.json() as { code: string };

    expect(res.status).toBe(429);
    expect(body.code).toBe("rate_limited");
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(JSON.stringify(body)).not.toContain("endpoint");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
