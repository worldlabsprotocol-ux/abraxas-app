import { describe, expect, it } from "vitest";
import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";
import { buildPartnerWebhookPayload, webhookPayloadHasNoPii } from "@/lib/partner/webhooks/webhookPayloadContract";
import { PARTNER_PUBLIC_EVENT_TYPES } from "@/lib/partner/eventDelivery/contract";
import {
  partnerDeliveryIsRedeliverable,
  recommendPartnerActionChannel,
  toPartnerVisibleDeliveryState,
  toPartnerVisibleEventLabel,
  toPublicPartnerEventType,
  toStoredWebhookEventType,
} from "@/lib/partner/eventDelivery/mapping";
import { verifyPartnerWebhookEvent } from "@/lib/partner/eventDelivery/verify";
import { partnerEventDeliveryConformanceChecks } from "@/lib/partner/eventDelivery/conformance";
import { WEBHOOK_MAX_ATTEMPTS } from "@/lib/partner/webhooks/types";

describe("Partner Event Delivery contract", () => {
  it("maps legacy outbox types onto public event types", () => {
    expect(toPublicPartnerEventType("partner.receipt.issued")).toBe("receipt.issued");
    expect(toPublicPartnerEventType("partner.receipt.revoked")).toBe("receipt.revoked");
    expect(toStoredWebhookEventType("receipt.issued")).toBe("partner.receipt.issued");
    expect(toStoredWebhookEventType("receipt.revoked")).toBe("partner.receipt.revoked");
    expect(toPartnerVisibleEventLabel("partner.webhook.test")).toBe("TEST EVENT");
  });

  it("maps partner-visible delivery states including dead-lettered", () => {
    expect(toPartnerVisibleDeliveryState({ status: "pending", attempt_count: 0 })).toBe("queued");
    expect(toPartnerVisibleDeliveryState({ status: "delivered", attempt_count: 1 })).toBe("delivered");
    expect(toPartnerVisibleDeliveryState({ status: "retrying", attempt_count: 2 })).toBe("retrying");
    expect(toPartnerVisibleDeliveryState({ status: "failed", attempt_count: 2 })).toBe("failed");
    expect(toPartnerVisibleDeliveryState({ status: "failed", attempt_count: WEBHOOK_MAX_ATTEMPTS })).toBe("dead-lettered");
    expect(partnerDeliveryIsRedeliverable({ status: "failed", webhookEnabled: true })).toBe(true);
    expect(partnerDeliveryIsRedeliverable({ status: "delivered", webhookEnabled: true })).toBe(false);
  });

  it("recommends webhook, callback, or both", () => {
    expect(recommendPartnerActionChannel({
      webhookConfigured: true,
      webhookEnabled: true,
      callbackConfigured: true,
    })).toBe("both");
  });

  it("keeps PII out of every public event type", () => {
    for (const eventType of PARTNER_PUBLIC_EVENT_TYPES) {
      const payload = buildPartnerWebhookPayload({
        eventId: "11111111-1111-4111-8111-111111111111",
        eventType,
        occurredAt: "2026-09-18T00:00:00.000Z",
        partnerId: "partner-acme",
        policyId: "policy-v1",
        policyVersion: 1,
        receiptId: eventType === "integration.health_changed" ? null : "dr_safe",
        decisionId: eventType === "decision.denied" ? "decision-1" : null,
      });
      expect(payload.event_type === "receipt.issued" || payload.event_type === "receipt.revoked" || payload.event_type === eventType).toBe(true);
      expect(webhookPayloadHasNoPii(payload)).toBe(true);
      const text = JSON.stringify(payload);
      expect(text).not.toContain("@");
      expect(text).not.toContain("0x");
      expect(text).not.toMatch(/email|wallet|legal_name|date_of_birth|jwt|id_token/i);
    }
  });

  it("verifies signatures, rejects stale, duplicate, wrong partner, and invalid HMAC", () => {
    const payload = buildPartnerWebhookPayload({
      eventId: "evt-1",
      eventType: "receipt.issued",
      occurredAt: "2026-09-18T00:00:00.000Z",
      partnerId: "partner-acme",
      policyId: "policy-v1",
      policyVersion: 1,
      receiptId: "dr_1",
    });
    const rawBody = JSON.stringify(payload);
    const timestamp = "1700000000";
    const secret = "abx_whsec_test_secret_value_123";
    const signature = signWebhookBody({ secret, timestamp, rawBody });
    const seen = new Set<string>();

    const ok = verifyPartnerWebhookEvent({
      secret, timestamp, rawBody, signatureHeader: signature,
      expectedPartnerId: "partner-acme", seenEventIds: seen, nowSec: 1700000000,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.authorization).toBe(false);

    const dup = verifyPartnerWebhookEvent({
      secret, timestamp, rawBody, signatureHeader: signature,
      expectedPartnerId: "partner-acme", seenEventIds: seen, nowSec: 1700000000,
    });
    expect(dup.ok).toBe(true);
    if (dup.ok) expect(dup.duplicate).toBe(true);

    const bad = verifyPartnerWebhookEvent({
      secret, timestamp, rawBody, signatureHeader: "v1=00",
      expectedPartnerId: "partner-acme", seenEventIds: new Set(), nowSec: 1700000000,
    });
    expect(bad.ok).toBe(false);

    const stale = verifyPartnerWebhookEvent({
      secret, timestamp, rawBody, signatureHeader: signature,
      expectedPartnerId: "partner-acme", seenEventIds: new Set(), nowSec: 1700004000,
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error).toBe("stale_timestamp");

    const wrong = verifyPartnerWebhookEvent({
      secret, timestamp, rawBody, signatureHeader: signature,
      expectedPartnerId: "other", seenEventIds: new Set(), nowSec: 1700000000,
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe("wrong_partner");
  });
});

describe("Partner Event Delivery conformance fixtures", () => {
  it("passes every required event-delivery check", () => {
    const checks = partnerEventDeliveryConformanceChecks();
    expect(checks.every((check) => check.status === "pass")).toBe(true);
  });
});
