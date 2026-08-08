import { afterEach, describe, expect, it, vi } from "vitest";
import { parseWebhookEndpointUrl } from "@/lib/partner/webhooks/webhookEndpointValidation";
import { deliverPartnerWebhookEvent } from "@/lib/partner/webhooks/webhookDelivery";
import type { PartnerWebhookOutboxRecord } from "@/lib/partner/webhooks/types";

describe("webhook delivery-time DNS revalidation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks DNS rebinding: safe at configuration time, unsafe at delivery time", async () => {
    const dns = await import("dns");
    const lookupMock = vi.spyOn(dns.promises, "lookup");
    lookupMock
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }] as never)
      .mockResolvedValueOnce([{ address: "10.0.0.8", family: 4 }] as never);

    const { validateWebhookEndpointUrl } = await import("@/lib/partner/webhooks/webhookEndpointValidation");
    const configCheck = await validateWebhookEndpointUrl("https://partner.example/webhook");
    expect(configCheck.ok).toBe(true);

    const fetchMock = vi.fn();
    const record: PartnerWebhookOutboxRecord = {
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
        receipt_id: "dr_1",
      },
      occurred_at: "2026-01-01T00:00:00.000Z",
      status: "delivering",
      attempt_count: 0,
      next_attempt_at: "2026-01-01T00:00:00.000Z",
      delivered_at: null,
      last_error_code: null,
      delivery_lease_until: null,
      delivery_worker_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const result = await deliverPartnerWebhookEvent(
      record,
      "abx_whsec_test_secret_value_12345",
      "https://partner.example/webhook",
      { fetchFn: fetchMock },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("webhook_endpoint_resolves_private");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(parseWebhookEndpointUrl("https://partner.example/webhook")).not.toBeNull();
  });
});
