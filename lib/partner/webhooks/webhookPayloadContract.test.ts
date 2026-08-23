import { describe, expect, it } from "vitest";
import {
  WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS,
  WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS,
  buildPartnerWebhookTestPayload,
  webhookTestPayloadIsValid,
} from "@/lib/partner/webhooks/webhookPayloadContract";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";

describe("webhookPayloadContract test events", () => {
  it("requires test: true and only allowed keys", () => {
    const payload = buildPartnerWebhookTestPayload({
      eventId: "evt-test-1",
      occurredAt: "2026-08-23T00:00:00.000Z",
      partnerId: "partner-a",
    });

    expect(payload.test).toBe(true);
    expect(payload.event_type).toBe(PARTNER_WEBHOOK_TEST_EVENT_TYPE);
    expect(webhookTestPayloadIsValid(payload)).toBe(true);
    expect(Object.keys(payload).sort()).toEqual([...WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS].sort());
  });

  it("rejects receipt, decision, policy, and reason fields", () => {
    const payload = buildPartnerWebhookTestPayload({
      eventId: "evt-test-2",
      occurredAt: "2026-08-23T00:00:00.000Z",
      partnerId: "partner-a",
    });

    for (const key of WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS) {
      const invalid = { ...payload, [key]: "blocked" } as typeof payload & Record<string, string>;
      expect(webhookTestPayloadIsValid(invalid)).toBe(false);
    }
  });

  it("rejects payloads that look like PII", () => {
    const payload = {
      event_id: "evt-test-3",
      event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE,
      occurred_at: "2026-08-23T00:00:00.000Z",
      partner_id: "holder@example.com",
      test: true as const,
    };

    expect(webhookTestPayloadIsValid(payload)).toBe(false);
  });
});
