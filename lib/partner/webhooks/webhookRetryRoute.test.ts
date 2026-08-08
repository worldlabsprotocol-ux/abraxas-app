import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requeueMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkAdminAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/partner/webhooks/webhookDeadLetter", () => ({
  requeueFailedWebhookDelivery: (...args: unknown[]) => requeueMock(...args),
}));

import { POST } from "@/app/api/admin/partners/webhooks/retry/route";

describe("admin webhook retry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requeues failed delivery for admin", async () => {
    requeueMock.mockResolvedValue({ ok: true, event_id: "evt-1" });

    const res = await POST(new NextRequest("http://localhost/api/admin/partners/webhooks/retry", {
      method: "POST",
      body: JSON.stringify({ outbox_id: "outbox-1" }),
    }));
    const body = await res.json() as { ok: boolean; event_id: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.event_id).toBe("evt-1");
    expect(requeueMock).toHaveBeenCalledWith({ outboxId: "outbox-1", retriedBy: "admin" });
  });

  it("returns operator-friendly error when delivery disabled", async () => {
    requeueMock.mockResolvedValue({ ok: false, error: "webhook_disabled" });

    const res = await POST(new NextRequest("http://localhost/api/admin/partners/webhooks/retry", {
      method: "POST",
      body: JSON.stringify({ outbox_id: "outbox-1" }),
    }));
    const body = await res.json() as { message: string };

    expect(res.status).toBe(400);
    expect(body.message).toContain("Enable webhook");
  });
});
