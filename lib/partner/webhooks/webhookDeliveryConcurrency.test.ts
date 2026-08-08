import { beforeEach, describe, expect, it, vi } from "vitest";
import { processWebhookOutboxEvent } from "@/lib/partner/webhooks/webhookDelivery";

const claimMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  claimWebhookOutboxEvent: (...args: unknown[]) => claimMock(...args),
  listDispatchableWebhookEvents: vi.fn(),
  mapOutboxRow: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

describe("concurrent webhook dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimMock.mockReset();
    fromMock.mockReset();
  });

  it("only one worker processes an event when the other loses the lease claim", async () => {
    claimMock
      .mockResolvedValueOnce({
        id: "outbox-1",
        partner_id: "partner-a",
        event_type: "partner.receipt.issued",
        event_id: "evt-1",
        idempotency_key: "idem-1",
        payload: {
          event_id: "evt-1",
          event_type: "partner.receipt.issued",
          occurred_at: "2026-01-01T00:00:00.000Z",
          partner_id: "partner-a",
        },
        occurred_at: "2026-01-01T00:00:00.000Z",
        status: "delivering",
        attempt_count: 0,
        next_attempt_at: "2026-01-01T00:00:00.000Z",
        delivered_at: null,
        last_error_code: null,
        delivery_lease_until: "2026-01-01T00:05:00.000Z",
        delivery_worker_id: "worker-a",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      })
      .mockResolvedValueOnce(null);

    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { endpoint_url: "https://hooks.example/a", enabled: false } }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_outbox") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({}),
          }),
        };
      }
      return {};
    });

    const first = await processWebhookOutboxEvent("outbox-1", "worker-a");
    const second = await processWebhookOutboxEvent("outbox-1", "worker-b");

    expect(first).not.toBe("skipped");
    expect(second).toBe("skipped");
    expect(claimMock).toHaveBeenCalledTimes(2);
  });
});
