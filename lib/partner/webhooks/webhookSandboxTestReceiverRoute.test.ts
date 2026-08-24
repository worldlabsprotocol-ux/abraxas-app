import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const receiveMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookSandboxTestReceiver", () => ({
  SANDBOX_RECEIVER_GENERIC_ERROR: "Invalid request",
  SANDBOX_RECEIVER_REQUEST_HEADERS: {
    eventId: "x-abraxas-webhook-id",
    timestamp: "x-abraxas-webhook-timestamp",
    signature: "x-abraxas-webhook-signature",
  },
  receiveSandboxTestWebhook: (...args: unknown[]) => receiveMock(...args),
}));

import { POST } from "@/app/api/partner/webhooks/sandbox-test-receiver/route";

describe("sandbox test receiver route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generic 400 without leaking validation details", async () => {
    receiveMock.mockResolvedValue({ ok: false, status: 400 });

    const res = await POST(
      new NextRequest("http://localhost/api/partner/webhooks/sandbox-test-receiver", {
        method: "POST",
        body: '{"event_id":"evt-1"}',
        headers: {
          "x-abraxas-webhook-id": "evt-1",
          "x-abraxas-webhook-timestamp": "1700000000",
          "x-abraxas-webhook-signature": "v1=bad",
        },
      }),
    );
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request");
    expect(JSON.stringify(body)).not.toContain("signature");
    expect(JSON.stringify(body)).not.toContain("timestamp");
    expect(JSON.stringify(body)).not.toContain("payload");
    expect(JSON.stringify(body)).not.toContain("endpoint");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("returns 404 when receiver is disabled", async () => {
    receiveMock.mockResolvedValue({ ok: false, status: 404 });

    const res = await POST(
      new NextRequest("http://localhost/api/partner/webhooks/sandbox-test-receiver", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(res.status).toBe(404);
  });

  it("returns ok:true for first verified receipt", async () => {
    receiveMock.mockResolvedValue({
      ok: true,
      received: true,
      idempotent: false,
      eventId: "evt-1",
      partnerId: "partner-sandbox",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/partner/webhooks/sandbox-test-receiver", {
        method: "POST",
        body: '{"event_id":"evt-1"}',
      }),
    );
    const body = await res.json() as { ok: boolean; received: boolean; idempotent?: boolean };

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, received: true });
    expect(body.idempotent).toBeUndefined();
  });

  it("returns idempotent:true for duplicate verified receipt", async () => {
    receiveMock.mockResolvedValue({
      ok: true,
      received: true,
      idempotent: true,
      eventId: "evt-1",
      partnerId: "partner-sandbox",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/partner/webhooks/sandbox-test-receiver", {
        method: "POST",
        body: '{"event_id":"evt-1"}',
      }),
    );
    const body = await res.json() as { ok: boolean; received: boolean; idempotent: boolean };

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, received: true, idempotent: true });
  });
});
