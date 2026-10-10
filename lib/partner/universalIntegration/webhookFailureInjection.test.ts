// FILE: lib/partner/universalIntegration/webhookFailureInjection.test.ts
// Deterministic webhook failure / idempotency regression (Phase 6).

import { describe, expect, it } from "vitest";
import { WEBHOOK_MAX_ATTEMPTS, WEBHOOK_RETRY_DELAYS_MS } from "@/lib/partner/webhooks/types";
import { failedDeliveryOperationalState } from "@/lib/partner/webhooks/webhookDeadLetter";
import { buildWebhookIdempotencyKey, webhookPayloadHasNoPii } from "@/lib/partner/webhooks/webhookPayloadContract";
import { toPartnerVisibleDeliveryState } from "@/lib/partner/eventDelivery/mapping";

describe("webhook failure injection matrix", () => {
  it("dead-letters after max attempts", () => {
    expect(failedDeliveryOperationalState(WEBHOOK_MAX_ATTEMPTS)).toBe("dead-lettered");
    expect(failedDeliveryOperationalState(WEBHOOK_MAX_ATTEMPTS - 1)).toBe("failing");
  });

  it("uses bounded backoff schedule", () => {
    expect(WEBHOOK_RETRY_DELAYS_MS.length).toBe(WEBHOOK_MAX_ATTEMPTS - 1);
    expect(WEBHOOK_RETRY_DELAYS_MS[0]).toBeGreaterThan(0);
  });

  it("deduplicates enqueue via stable idempotency keys", () => {
    const a = buildWebhookIdempotencyKey({
      partnerId: "p1",
      eventType: "receipt.issued",
      resourceId: "dr_1",
    });
    const b = buildWebhookIdempotencyKey({
      partnerId: "p1",
      eventType: "receipt.issued",
      resourceId: "dr_1",
    });
    expect(a).toBe(b);
    const c = buildWebhookIdempotencyKey({
      partnerId: "p2",
      eventType: "receipt.issued",
      resourceId: "dr_1",
    });
    expect(c).not.toBe(a);
  });

  it("rejects webhook payloads containing PII-shaped fields", () => {
    expect(webhookPayloadHasNoPii({
      event_type: "receipt.issued",
      partner_id: "p1",
      receipt_id: "dr_1",
      occurred_at: "2026-01-01T00:00:00.000Z",
    } as Parameters<typeof webhookPayloadHasNoPii>[0])).toBe(true);
    expect(webhookPayloadHasNoPii({
      event_type: "receipt.issued",
      partner_id: "p1",
      receipt_id: "dr_1",
      occurred_at: "2026-01-01T00:00:00.000Z",
      holder_email: "user@example.com",
    } as Parameters<typeof webhookPayloadHasNoPii>[0])).toBe(false);
  });

  it("maps duplicate delivery attempts to partner-visible states", () => {
    expect(toPartnerVisibleDeliveryState({ status: "delivered", attempt_count: 1 })).toBe("delivered");
    expect(toPartnerVisibleDeliveryState({ status: "failed", attempt_count: 1 })).toBe("failed");
    expect(toPartnerVisibleDeliveryState({ status: "failed", attempt_count: WEBHOOK_MAX_ATTEMPTS })).toBe("dead-lettered");
    expect(failedDeliveryOperationalState(1)).toBe("failing");
  });
});
