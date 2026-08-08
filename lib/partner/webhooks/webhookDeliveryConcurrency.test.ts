import { beforeEach, describe, expect, it, vi } from "vitest";

const claimMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookConfigService", () => ({
  loadPartnerWebhookSigningSecret: vi.fn().mockResolvedValue("abx_whsec_test_secret_value_12345"),
}));

vi.mock("@/lib/partner/webhooks/webhookEndpointValidation", () => ({
  validateWebhookEndpointForDelivery: vi.fn().mockResolvedValue({
    ok: true,
    deliveryUrl: "https://hooks.example/a",
  }),
}));

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  claimWebhookOutboxEvent: (...args: unknown[]) => claimMock(...args),
  finalizeWebhookOutboxDelivery: vi.fn().mockResolvedValue(true),
  listDispatchableWebhookEvents: vi.fn(),
  mapOutboxRow: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

import { processWebhookOutboxEvent } from "@/lib/partner/webhooks/webhookDelivery";

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
        delivery_claim_id: "claim-a",
        delivery_attempt_number: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      })
      .mockResolvedValueOnce(null);

    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { endpoint_url: "https://hooks.example/a", enabled: true },
              }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_delivery_attempts") {
        return { insert: vi.fn().mockResolvedValue({}) };
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
