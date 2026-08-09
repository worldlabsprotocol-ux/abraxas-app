import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const evaluateMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookHealthMonitor", () => ({
  evaluateWebhookHealthAlerts: (...args: unknown[]) => evaluateMock(...args),
}));

import { GET } from "@/app/api/cron/partner-webhook-health/route";

describe("partner webhook health cron route", () => {
  const prevSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    evaluateMock.mockResolvedValue({ evaluated: [], sent: [], recovered: [] });
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
  });

  it("returns 503 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-health"));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(503);
    expect(body.error).toBe("cron_not_configured");
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization is wrong", async () => {
    process.env.CRON_SECRET = "cron-test-secret";

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-health", {
      headers: { authorization: "Bearer wrong-secret" },
    }));

    expect(res.status).toBe(401);
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("evaluates health when authorized", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    evaluateMock.mockResolvedValue({
      evaluated: ["excessive_backlog"],
      sent: ["excessive_backlog"],
      recovered: [],
    });

    const res = await GET(new NextRequest("http://localhost/api/cron/partner-webhook-health", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    const body = await res.json() as { success: boolean; alertsSent: string[] };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alertsSent).toEqual(["excessive_backlog"]);
    expect(evaluateMock).toHaveBeenCalled();
  });
});
