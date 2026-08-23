import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const checkProductionSensitiveAdminAccessMock = vi.fn();
const getObservabilityMock = vi.fn();
const getAttemptsMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookOperatorObservability", () => ({
  getPartnerWebhookObservability: (...args: unknown[]) => getObservabilityMock(...args),
  getPartnerWebhookDeliveryAttempts: (...args: unknown[]) => getAttemptsMock(...args),
  validateObservabilityPartnerId: (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, error: "partner_id_required" };
    return { ok: true, value: trimmed };
  },
  validateObservabilityEventId: (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, error: "event_id_required" };
    return { ok: true, value: trimmed };
  },
}));

import { GET } from "@/app/api/admin/partners/webhooks/observability/route";

const baseObservability = {
  partner_id: "partner-a",
  webhook_configured: true,
  webhook_delivery_enabled: true,
  status_counts: {
    pending: 0,
    delivering: 0,
    retrying: 0,
    delivered: 1,
    failed: 0,
    unknown: 0,
  },
  dispatch_summary_available: false,
  follow_up: { recommended: false, reasons: [] },
  deliveries: [],
  disclaimer: "Queued, delivering, or retrying does not mean delivered.",
};

describe("admin webhook observability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    getObservabilityMock.mockResolvedValue(baseObservability);
    getAttemptsMock.mockResolvedValue([
      {
        attempt_number: 1,
        http_status: 503,
        error_code: "http_503",
        attempted_at: "2026-08-08T00:00:00.000Z",
      },
    ]);
  });

  it("returns 401 when admin access is denied", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(false);

    const res = await GET(new NextRequest("http://localhost/api/admin/partners/webhooks/observability?partner_id=partner-a"));
    expect(res.status).toBe(401);
  });

  it("returns 400 without partner_id", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/partners/webhooks/observability"));
    expect(res.status).toBe(400);
    expect(getObservabilityMock).not.toHaveBeenCalled();
  });

  it("returns partner-safe observability without forbidden fields", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/admin/partners/webhooks/observability?partner_id=partner-a"),
    );
    const body = await res.json() as { ok: boolean; observability: typeof baseObservability };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.observability.dispatch_summary_available).toBe(false);
    expect((body.observability as { dispatch_summary?: unknown }).dispatch_summary).toBeUndefined();

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("endpoint_url");
    expect(serialized).not.toContain("https://partner");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("payload");
    expect(serialized).not.toContain("response_snippet");
    expect(serialized).not.toContain("CRON_SECRET");
    expect(serialized).not.toContain("SQLSTATE");
    expect(serialized).not.toContain("alert_state");
  });

  it("returns 404 for cross-partner event_id without leaking existence", async () => {
    getAttemptsMock.mockResolvedValue(null);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/partners/webhooks/observability?partner_id=partner-a&event_id=evt-other"),
    );
    const body = await res.json() as { error: string };

    expect(res.status).toBe(404);
    expect(body.error).toBe("Delivery not found");
    expect(getAttemptsMock).toHaveBeenCalledWith({
      partnerId: "partner-a",
      eventId: "evt-other",
    });
  });

  it("returns attempts when partner_id and event_id match", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/admin/partners/webhooks/observability?partner_id=partner-a&event_id=evt-1"),
    );
    const body = await res.json() as { ok: boolean; attempts: Array<{ error_code: string | null }> };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.attempts[0]?.error_code).toBe("http_503");
    expect(JSON.stringify(body)).not.toContain("response_snippet");
  });
});
