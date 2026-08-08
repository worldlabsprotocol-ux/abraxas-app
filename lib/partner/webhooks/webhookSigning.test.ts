import { describe, expect, it } from "vitest";
import { signWebhookBody, verifyWebhookSignature } from "@/lib/partner/webhooks/webhookSigning";
import {
  buildPartnerWebhookPayload,
  webhookPayloadHasNoPii,
} from "@/lib/partner/webhooks/webhookPayloadContract";

describe("webhook signing", () => {
  it("verifies timestamped HMAC signatures", () => {
    const rawBody = JSON.stringify(buildPartnerWebhookPayload({
      eventId: "evt-1",
      eventType: "partner.receipt.issued",
      occurredAt: "2026-08-08T00:00:00.000Z",
      partnerId: "partner-a",
      receiptId: "dr_test",
      policyId: "policy-a",
      decisionId: "decision-a",
    }));
    const timestamp = "1700000000";
    const secret = "abx_whsec_test_secret_value_123";
    const signature = signWebhookBody({ secret, timestamp, rawBody });

    const result = verifyWebhookSignature({
      secret,
      timestamp,
      rawBody,
      signatureHeader: signature,
      nowSec: 1700000000,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects tampered bodies", () => {
    const rawBody = '{"event_id":"evt-1"}';
    const timestamp = "1700000000";
    const secret = "abx_whsec_test_secret_value_123";
    const signature = signWebhookBody({ secret, timestamp, rawBody });

    const result = verifyWebhookSignature({
      secret,
      timestamp,
      rawBody: '{"event_id":"evt-2"}',
      signatureHeader: signature,
      nowSec: 1700000000,
    });
    expect(result.ok).toBe(false);
  });
});

describe("webhook payload contract", () => {
  it("builds non-PII payloads", () => {
    const payload = buildPartnerWebhookPayload({
      eventId: "evt-1",
      eventType: "partner.receipt.revoked",
      occurredAt: "2026-08-08T00:00:00.000Z",
      partnerId: "partner-a",
      receiptId: "dr_test",
      reasonCode: "operator_security_review",
    });
    expect(webhookPayloadHasNoPii(payload)).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("@");
    expect(JSON.stringify(payload)).not.toContain("0x");
  });
});
