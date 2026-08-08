import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWebhookDispatchRunHealth,
  isWebhookDispatchSchedulerConfigured,
  recordWebhookDispatchRun,
} from "@/lib/partner/webhooks/webhookDispatchHealth";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

describe("webhook dispatch health", () => {
  const prevScheduler = process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED;
  const prevCron = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
    delete process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED;
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (prevScheduler === undefined) delete process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED;
    else process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = prevScheduler;
    if (prevCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevCron;
  });

  it("reports scheduler not configured when env flag is absent", () => {
    expect(isWebhookDispatchSchedulerConfigured()).toBe(false);
  });

  it("treats only the normalized string true as configured", () => {
    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = "true";
    expect(isWebhookDispatchSchedulerConfigured()).toBe(true);

    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = " true ";
    expect(isWebhookDispatchSchedulerConfigured()).toBe(true);

    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = "false";
    expect(isWebhookDispatchSchedulerConfigured()).toBe(false);

    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = "TRUE";
    expect(isWebhookDispatchSchedulerConfigured()).toBe(false);

    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = "1";
    expect(isWebhookDispatchSchedulerConfigured()).toBe(false);
  });

  it("records non-PII dispatch run summaries", async () => {
    const insertMock = vi.fn().mockResolvedValue({});
    fromMock.mockReturnValue({ insert: insertMock });

    await recordWebhookDispatchRun({
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:00:05.000Z",
      success: true,
      summary: { scanned: 2, delivered: 1, retrying: 1, failed: 0, skipped: 0, stale: 0 },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      scanned: 2,
      delivered: 1,
    }));
  });

  it("returns last success and failure timestamps", async () => {
    process.env.PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED = "true";
    process.env.CRON_SECRET = "secret";

    fromMock.mockImplementation((table: string) => {
      if (table !== "partner_webhook_dispatch_runs") return {};
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn((column: string, value: boolean) => ({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(
                  value
                    ? { data: { finished_at: "2026-01-02T00:00:00.000Z" } }
                    : { data: { finished_at: "2026-01-01T12:00:00.000Z", error_code: "db_down" } },
                ),
              }),
            }),
          })),
        }),
      };
    });

    const health = await getWebhookDispatchRunHealth();
    expect(health.scheduler_configured).toBe(true);
    expect(health.last_successful_run_at).toBe("2026-01-02T00:00:00.000Z");
    expect(health.last_failure_at).toBe("2026-01-01T12:00:00.000Z");
    expect(health.last_failure_error_code).toBe("db_down");
  });

  it("shows dispatch scheduler not yet configured message", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table !== "partner_webhook_dispatch_runs") return {};
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        }),
      };
    });

    const health = await getWebhookDispatchRunHealth();
    expect(health.scheduler_message).toContain("Dispatch scheduler not yet configured");
  });
});
