import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authenticatePartnerMock = vi.fn();
const getStatusMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

vi.mock("@/lib/partner/partnerWebhookPortalStatus", () => ({
  getPartnerWebhookPortalStatus: (...args: unknown[]) => getStatusMock(...args),
}));

import { GET } from "@/app/api/partner/webhooks/status/route";

const baseStatus = {
  key_environment: "sandbox" as const,
  has_webhooks_read_scope: true,
  webhook_configured: true,
  webhook_delivery_enabled: true,
  sandbox_notice: "Sandbox access notice",
  sandbox_test: {
    event_type: "partner.webhook.test" as const,
    available: false,
    requires_sandbox_key: true,
    readiness: {
      schema_ready: true,
      test_enqueue_ready: false,
      delivery_enabled: true,
      dispatch_ready: true,
      signing_ready: true,
    },
    blocked_reasons: ["test_enqueue_not_ready" as const],
  },
  disclaimer: "Webhook notifications are not proof of access.",
  endpoints: {
    delivery_history: "/api/v1/partner/webhooks/deliveries",
    sandbox_test_enqueue: "/api/partner/webhooks/test-delivery",
    status: "/api/partner/webhooks/status",
  },
};

const authCtx = {
  partnerId: "partner-a",
  apiKeyId: "key-1",
  displayName: "Partner A",
  keyPrefix: "abx_test_abc",
  scopes: ["webhooks:read"],
};

describe("partner webhook status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatusMock.mockResolvedValue(baseStatus);
  });

  it("returns 401 when no API key is provided", async () => {
    authenticatePartnerMock.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/partner/webhooks/status"));
    expect(res.status).toBe(401);
    expect(getStatusMock).not.toHaveBeenCalled();
  });

  it("uses authenticated partner identity only", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });

    await GET(
      new NextRequest("http://localhost/api/partner/webhooks/status?partner_id=partner-b"),
    );

    expect(getStatusMock).toHaveBeenCalledWith({
      partnerId: "partner-a",
      keyPrefix: "abx_test_abc",
      scopes: ["webhooks:read"],
    });
  });

  it("returns partner-safe status without partner_id or callback URL fields", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });

    const res = await GET(new NextRequest("http://localhost/api/partner/webhooks/status"));
    const body = await res.json() as { ok: boolean; webhook_status: typeof baseStatus };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.webhook_status.sandbox_test.readiness.test_enqueue_ready).toBe(false);
    expect(body.webhook_status.sandbox_test.available).toBe(false);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("partner_id");
    expect(serialized).not.toContain("partner-a");
    expect(serialized).not.toContain("endpoint_url");
    expect(serialized).not.toMatch(/https:\/\/partner/);
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("CRON");
    expect(serialized).not.toContain("SQLSTATE");
  });
});
