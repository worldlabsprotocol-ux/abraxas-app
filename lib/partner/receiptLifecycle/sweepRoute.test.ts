import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sweepMock = vi.fn();
vi.mock("@/lib/partner/receiptLifecycle", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/receiptLifecycle")>("@/lib/partner/receiptLifecycle");
  return {
    ...actual,
    sweepExpiringReceipts: (...args: unknown[]) => sweepMock(...args),
  };
});

import { GET } from "@/app/api/cron/receipt-lifecycle-sweep/route";
import { resetReceiptLifecycleSweepRateLimitForTests } from "@/lib/partner/receiptLifecycle";

describe("receipt lifecycle sweep route", () => {
  const previous = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    resetReceiptLifecycleSweepRateLimitForTests();
    sweepMock.mockResolvedValue({
      ok: true,
      scanned: 0,
      enqueued: 0,
      duplicates: 0,
      skipped: 0,
      live_send: false,
    });
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it("fails closed without cron secret and never live-sends", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(new NextRequest("http://localhost/api/cron/receipt-lifecycle-sweep"));
    expect(res.status).toBe(503);
    expect((await res.json() as { live_send?: boolean }).live_send).toBe(false);
    expect(sweepMock).not.toHaveBeenCalled();
  });

  it("requires bearer authorization", async () => {
    process.env.CRON_SECRET = "sweep-secret";
    const denied = await GET(new NextRequest("http://localhost/api/cron/receipt-lifecycle-sweep"));
    expect(denied.status).toBe(401);
    const ok = await GET(new NextRequest("http://localhost/api/cron/receipt-lifecycle-sweep", {
      headers: { authorization: "Bearer sweep-secret" },
    }));
    expect(ok.status).toBe(200);
    expect(sweepMock).toHaveBeenCalledTimes(1);
  });
});
