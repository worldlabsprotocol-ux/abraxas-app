import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const processBatchMock = vi.fn();
const recordRunMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookDelivery", () => ({
  processWebhookOutboxBatch: (...args: unknown[]) => processBatchMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookDispatchHealth", () => ({
  recordWebhookDispatchRun: (...args: unknown[]) => recordRunMock(...args),
}));

import { GET } from "@/app/api/cron/partner-webhook-dispatch/route";

describe("partner webhook dispatch cron route", () => {
  const prevSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    processBatchMock.mockResolvedValue({
      scanned: 0,
      delivered: 0,
      retrying: 0,
      failed: 0,
      skipped: 0,
      stale: 0,
    });
    recordRunMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
  });

  it("returns 503 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-dispatch"));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(503);
    expect(body.error).toBe("cron_not_configured");
    expect(processBatchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization is missing", async () => {
    process.env.CRON_SECRET = "cron-test-secret";

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-dispatch"));
    expect(res.status).toBe(401);
    expect(processBatchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization is wrong", async () => {
    process.env.CRON_SECRET = "cron-test-secret";

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-dispatch", {
      headers: { authorization: "Bearer wrong-secret" },
    }));
    expect(res.status).toBe(401);
    expect(processBatchMock).not.toHaveBeenCalled();
  });

  it("dispatches when CRON_SECRET and Authorization match", async () => {
    process.env.CRON_SECRET = "cron-test-secret";

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-dispatch", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    const body = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(processBatchMock).toHaveBeenCalledWith({ limit: 50 });
    expect(recordRunMock).toHaveBeenCalled();
  });
});
