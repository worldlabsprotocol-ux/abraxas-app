import { beforeEach, describe, expect, it, vi } from "vitest";
import { processWebhookOutboxEvent } from "@/lib/partner/webhooks/webhookDelivery";

const claimMock = vi.fn();
const finalizeMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  claimWebhookOutboxEvent: (...args: unknown[]) => claimMock(...args),
  finalizeWebhookOutboxDelivery: (...args: unknown[]) => finalizeMock(...args),
  listDispatchableWebhookEvents: vi.fn(),
  mapOutboxRow: vi.fn(),
}));

vi.mock("@/lib/partner/webhooks/webhookConfigService", () => ({
  loadPartnerWebhookSigningSecret: vi.fn().mockResolvedValue("abx_whsec_test_secret_value_12345"),
}));

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

vi.mock("@/lib/partner/webhooks/webhookEndpointValidation", () => ({
  validateWebhookEndpointForDelivery: vi.fn().mockResolvedValue({
    ok: true,
    deliveryUrl: "https://hooks.partner.example/abraxas",
  }),
}));

const baseRecord = {
  id: "outbox-1",
  partner_id: "partner-a",
  event_type: "partner.receipt.issued" as const,
  event_id: "evt-1",
  idempotency_key: "idem-1",
  payload: {
    event_id: "evt-1",
    event_type: "partner.receipt.issued" as const,
    occurred_at: "2026-01-01T00:00:00.000Z",
    partner_id: "partner-a",
  },
  occurred_at: "2026-01-01T00:00:00.000Z",
  status: "delivering" as const,
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
};

describe("stale webhook worker lease protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimMock.mockReset();
    finalizeMock.mockReset();
    fromMock.mockReset();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    }) as unknown as typeof fetch;
  });

  it("worker A cannot overwrite worker B after lease reclaim", async () => {
    claimMock.mockResolvedValueOnce({
      ...baseRecord,
      delivery_worker_id: "worker-a",
      delivery_claim_id: "claim-a",
      delivery_lease_until: "2026-01-01T00:01:00.000Z",
    });

    finalizeMock.mockResolvedValueOnce(false);

    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { endpoint_url: "https://hooks.partner.example/abraxas", enabled: true },
              }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_delivery_attempts") {
        return { insert: vi.fn().mockResolvedValue({}) };
      }
      return {};
    });

    const outcome = await processWebhookOutboxEvent("outbox-1", "worker-a");

    expect(outcome).toBe("stale");
    expect(finalizeMock).toHaveBeenCalledWith(expect.objectContaining({
      workerId: "worker-a",
      deliveryClaimId: "claim-a",
      patch: expect.objectContaining({ status: "delivered" }),
    }));
  });
});
