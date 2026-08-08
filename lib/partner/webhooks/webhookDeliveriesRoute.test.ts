import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const listDeliveriesMock = vi.fn();
const authenticatePartnerMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  listPartnerWebhookDeliveries: (...args: unknown[]) => listDeliveriesMock(...args),
}));

import { GET } from "@/app/api/v1/partner/webhooks/deliveries/route";

describe("partner webhook deliveries API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires webhooks:read scope", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: false,
      error: "Missing scope: webhooks:read",
      status: 403,
    });

    const res = await GET(new NextRequest("http://localhost/api/v1/partner/webhooks/deliveries"));
    expect(res.status).toBe(403);
    expect(listDeliveriesMock).not.toHaveBeenCalled();
  });

  it("returns only authenticated partner deliveries", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: { partnerId: "partner-a", apiKeyId: "key-1", displayName: "A", keyPrefix: "abx", scopes: ["webhooks:read"] },
    });
    listDeliveriesMock.mockResolvedValue([{
      event_id: "evt-1",
      event_type: "partner.receipt.issued",
      status: "delivered",
      occurred_at: "2026-01-01T00:00:00.000Z",
      delivered_at: "2026-01-01T00:00:05.000Z",
      attempt_count: 1,
      last_error_code: null,
    }]);

    const res = await GET(new NextRequest("http://localhost/api/v1/partner/webhooks/deliveries"));
    const body = await res.json() as { partner_id: string; deliveries: unknown[] };

    expect(res.status).toBe(200);
    expect(body.partner_id).toBe("partner-a");
    expect(listDeliveriesMock).toHaveBeenCalledWith({ partnerId: "partner-a", limit: 50 });
    expect(JSON.stringify(body)).not.toContain("0x");
    expect(JSON.stringify(body)).not.toContain("@");
  });
});
