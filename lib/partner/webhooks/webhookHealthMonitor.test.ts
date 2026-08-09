import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateWebhookHealthAlerts } from "@/lib/partner/webhooks/webhookHealthMonitor";

const syncMock = vi.fn();
const deliveryHealthMock = vi.fn();
const dispatchHealthMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookAlerts", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/partner/webhooks/webhookAlerts")>();
  return {
    ...actual,
    syncWebhookAlert: (...args: unknown[]) => syncMock(...args),
  };
});

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  getWebhookDeliveryHealth: (...args: unknown[]) => deliveryHealthMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookDispatchHealth", () => ({
  getWebhookDispatchRunHealth: (...args: unknown[]) => dispatchHealthMock(...args),
  isWebhookDispatchSchedulerConfigured: () => true,
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

describe("webhook health monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncMock.mockResolvedValue({ sent: false, kind: "skipped" });
    deliveryHealthMock.mockResolvedValue({
      pending: 0,
      delivering: 0,
      delivered: 0,
      retrying: 0,
      failed: 0,
    });
    dispatchHealthMock.mockResolvedValue({
      cron_secret_configured: true,
      last_successful_run_at: new Date().toISOString(),
    });
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
    });
    process.env.ABRAXAS_WEBHOOK_MASTER_KEY = "test-master-key";
  });

  afterEach(() => {
    delete process.env.ABRAXAS_WEBHOOK_MASTER_KEY;
  });

  it("evaluates backlog, terminal failure, stale dispatcher, and signing checks", async () => {
    deliveryHealthMock.mockResolvedValue({
      pending: 40,
      delivering: 0,
      delivered: 0,
      retrying: 15,
      failed: 2,
    });
    dispatchHealthMock.mockResolvedValue({
      cron_secret_configured: true,
      last_successful_run_at: "2020-01-01T00:00:00.000Z",
    });
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ signing_secret_ciphertext: "bad", signing_secret_iv: "bad" }],
        }),
      }),
    });

    const result = await evaluateWebhookHealthAlerts({
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.evaluated).toEqual([
      "terminal_delivery_failure",
      "excessive_backlog",
      "dispatcher_stale",
      "signing_secret_failure",
    ]);
    expect(syncMock).toHaveBeenCalledWith(expect.objectContaining({
      alertKey: "terminal_delivery_failure",
      active: true,
      metadata: { failed_count: 2 },
    }));
    expect(syncMock).toHaveBeenCalledWith(expect.objectContaining({
      alertKey: "excessive_backlog",
      active: true,
    }));
    expect(syncMock).toHaveBeenCalledWith(expect.objectContaining({
      alertKey: "dispatcher_stale",
      active: true,
    }));
    expect(syncMock).not.toHaveBeenCalledWith(expect.objectContaining({
      alertKey: "dispatcher_execution_failure",
    }));
  });

  it("only reports sent/recovered when result.sent is true", async () => {
    syncMock
      .mockResolvedValueOnce({ sent: false, kind: "alert" })
      .mockResolvedValueOnce({ sent: true, kind: "alert" })
      .mockResolvedValueOnce({ sent: false, kind: "recovery" })
      .mockResolvedValueOnce({ sent: true, kind: "recovery" });

    const result = await evaluateWebhookHealthAlerts({
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.sent).toEqual(["excessive_backlog", "signing_secret_failure"]);
    expect(result.recovered).toEqual(["signing_secret_failure"]);
  });
});
