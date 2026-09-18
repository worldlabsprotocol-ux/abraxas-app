import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.fn();
const appMock = vi.fn();
const enqueueMock = vi.fn();

vi.mock("@/lib/partner/launchpad/apiHelpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/apiHelpers")>(
    "@/lib/partner/launchpad/apiHelpers",
  );
  return {
    ...actual,
    requireLaunchpadSession: (...args: unknown[]) => sessionMock(...args),
    enforceLaunchpadRateLimit: () => null,
  };
});

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => appMock(...args),
}));

vi.mock("@/lib/partner/eventDelivery/launchpadWebhook", () => ({
  enqueueLaunchpadWebhookTest: (...args: unknown[]) => enqueueMock(...args),
}));

import { POST } from "@/app/api/launchpad/applications/[id]/webhooks/test/route";

describe("launchpad webhook TEST EVENT route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { partnerId: "partner-a" } });
    appMock.mockResolvedValue({ id: "app-1", partner_id: "partner-a" });
  });

  it("returns enqueue_unavailable without raw database errors", async () => {
    enqueueMock.mockResolvedValue({ ok: false, code: "enqueue_unavailable" });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhooks/test", {
      method: "POST",
    }), { params: { id: "app-1" } });
    const body = await res.json() as { code: string; error: string };
    expect(res.status).toBe(400);
    expect(body.code).toBe("enqueue_unavailable");
    expect(body.error).toBe("enqueue_unavailable");
    expect(JSON.stringify(body)).not.toMatch(/postgres|PGRST|stack|password|secret/i);
  });

  it("maps unknown persistence errors to persistence_failed", async () => {
    enqueueMock.mockResolvedValue({ ok: false, code: "violates check constraint event_type" });
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhooks/test", {
      method: "POST",
    }), { params: { id: "app-1" } });
    const body = await res.json() as { code: string; error: string };
    expect(res.status).toBe(400);
    expect(body.code).toBe("persistence_failed");
    expect(body.error).toBe("persistence_failed");
  });

  it("returns webhook_disabled and webhook_not_configured as public codes", async () => {
    enqueueMock.mockResolvedValue({ ok: false, code: "webhook_disabled" });
    const disabled = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhooks/test", {
      method: "POST",
    }), { params: { id: "app-1" } });
    expect((await disabled.json() as { code: string }).code).toBe("webhook_disabled");

    enqueueMock.mockResolvedValue({ ok: false, code: "webhook_not_configured" });
    const missing = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhooks/test", {
      method: "POST",
    }), { params: { id: "app-1" } });
    expect((await missing.json() as { code: string }).code).toBe("webhook_not_configured");
  });
});
