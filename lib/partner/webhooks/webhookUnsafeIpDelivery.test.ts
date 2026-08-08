import { describe, expect, it, vi } from "vitest";
import { deliverPartnerWebhookEvent } from "@/lib/partner/webhooks/webhookDelivery";
import type { PartnerWebhookOutboxRecord } from "@/lib/partner/webhooks/types";

function makeRecord(): PartnerWebhookOutboxRecord {
  return {
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
  };
}

describe("unsafe webhook IPs never reach fetch", () => {
  it.each([
    "https://0.0.0.8/webhook",
    "https://100.64.0.1/webhook",
    "https://192.0.2.1/webhook",
    "https://198.18.0.1/webhook",
    "https://224.0.0.1/webhook",
    "https://255.255.255.255/webhook",
    "https://[::1]/webhook",
    "https://[2001:db8::1]/webhook",
    "https://[::ffff:127.0.0.1]/webhook",
  ])("blocks %s at delivery time", async (endpointUrl) => {
    const fetchMock = vi.fn();
    const result = await deliverPartnerWebhookEvent(
      makeRecord(),
      "abx_whsec_test_secret_value_12345",
      endpointUrl,
      { fetchFn: fetchMock },
    );

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
