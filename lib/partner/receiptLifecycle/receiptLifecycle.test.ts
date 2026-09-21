import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPartnerWebhookPayload, webhookPayloadHasNoPii } from "@/lib/partner/webhooks/webhookPayloadContract";
import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";
import { verifyPartnerWebhookEvent, verifyWebhookThenReceipt } from "@/lib/partner/eventDelivery/verify";
import { permitProtocolAction } from "@/lib/partner/integrationKit/client";
import {
  RECEIPT_LIFECYCLE_EVENT_TYPES,
  RECEIPT_LIFECYCLE_NOT_GRANT,
  enqueueReceiptLifecycleEvent,
  lifecycleEnvelopeLeaks,
  projectLifecycleFixture,
  resetReceiptLifecycleSweepRateLimitForTests,
  sweepExpiringReceipts,
} from "@/lib/partner/receiptLifecycle";

const enqueueMock = vi.fn();

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  enqueuePartnerWebhookEvent: (...args: unknown[]) => enqueueMock(...args),
  enqueuePartnerWebhookEventBestEffort: vi.fn(),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

afterEach(() => {
  enqueueMock.mockReset();
  fromMock.mockReset();
  resetReceiptLifecycleSweepRateLimitForTests();
});

describe("receipt lifecycle events", () => {
  it("scopes issuance to the requesting partner and never grants", async () => {
    enqueueMock.mockResolvedValue({ ok: true, created: true, eventId: "evt-1" });
    const result = await enqueueReceiptLifecycleEvent({
      partnerId: "acme",
      eventType: "receipt.issued",
      receiptId: "dr_acme",
      policyId: "acme-v1",
      policyVersion: 1,
    });
    expect(result.ok).toBe(true);
    expect(enqueueMock).toHaveBeenCalledWith(expect.objectContaining({
      partnerId: "acme",
      eventType: "partner.receipt.issued",
      receiptId: "dr_acme",
      isGrant: false,
      mustReverify: true,
      validityClass: "current",
    }));
    expect(enqueueMock.mock.calls[0]?.[0].partnerId).not.toBe("other");
  });

  it("enqueues terminal revoked and invalidated events with distinct types", async () => {
    enqueueMock.mockResolvedValue({ ok: true, created: true, eventId: "evt-2" });
    await enqueueReceiptLifecycleEvent({
      partnerId: "acme",
      eventType: "receipt.revoked",
      receiptId: "dr_acme",
    });
    await enqueueReceiptLifecycleEvent({
      partnerId: "acme",
      eventType: "receipt.invalidated",
      receiptId: "dr_derived",
    });
    expect(enqueueMock.mock.calls[0]?.[0].eventType).toBe("partner.receipt.revoked");
    expect(enqueueMock.mock.calls[1]?.[0].eventType).toBe("receipt.invalidated");
    expect(enqueueMock.mock.calls[1]?.[0].validityClass).toBe("invalidated");
  });

  it("denies cross-tenant enqueue without a partner id", async () => {
    const denied = await enqueueReceiptLifecycleEvent({
      partnerId: " ",
      eventType: "receipt.issued",
      receiptId: "dr_x",
    });
    expect(denied.ok).toBe(false);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("deduplicates sweep and terminal retries", async () => {
    enqueueMock.mockResolvedValueOnce({ ok: true, created: true, eventId: "evt-a" });
    enqueueMock.mockResolvedValueOnce({ ok: true, created: false, eventId: "evt-a" });
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            gt: () => ({
              lte: () => ({
                limit: () => Promise.resolve({
                  data: [{
                    id: "dr_1",
                    partner_id: "acme",
                    policy_id: "p1",
                    policy_version: 1,
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                    status: "active",
                    revoked_at: null,
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    const first = await sweepExpiringReceipts({ now: new Date() });
    const second = await sweepExpiringReceipts({ now: new Date() });
    expect(first.ok && first.enqueued).toBe(1);
    expect(second.ok && second.duplicates).toBe(1);
    expect(first.ok && first.live_send).toBe(false);
  });

  it("classifies expiring without implying continued validity", () => {
    const fixture = projectLifecycleFixture("receipt.expiring");
    expect(fixture.validity_class).toBe("expiring");
    expect(fixture.is_grant).toBe(false);
    expect(fixture.must_reverify).toBe(true);
    expect(fixture.instruction).toBe(RECEIPT_LIFECYCLE_NOT_GRANT);
  });

  it("keeps serialization free of PII, evidence, wallets, callbacks, and secrets", () => {
    for (const eventType of RECEIPT_LIFECYCLE_EVENT_TYPES) {
      const fixture = projectLifecycleFixture(eventType);
      expect(lifecycleEnvelopeLeaks(fixture)).toEqual([]);
      const blob = JSON.stringify(fixture);
      expect(blob).not.toMatch(/wallet_address|date_of_birth|callback_url|abx_whsec_|source_receipt|claims_json/);
    }
  });

  it("requires HMAC plus public-receipt re-fetch before any action", async () => {
    const payload = buildPartnerWebhookPayload({
      eventId: "evt-life",
      eventType: "receipt.issued",
      occurredAt: "2026-09-21T00:00:00.000Z",
      partnerId: "acme",
      policyId: "p1",
      policyVersion: 1,
      receiptId: "dr_1",
      validityClass: "current",
      mustReverify: true,
      isGrant: false,
    });
    expect(payload.is_grant).toBe(false);
    expect(webhookPayloadHasNoPii(payload)).toBe(true);
    const rawBody = JSON.stringify(payload);
    const timestamp = "1700000000";
    const secret = "abx_whsec_lifecycle_test";
    const signature = signWebhookBody({ secret, timestamp, rawBody });
    const verified = verifyPartnerWebhookEvent({
      secret,
      timestamp,
      rawBody,
      signatureHeader: signature,
      expectedPartnerId: "acme",
      seenEventIds: new Set(),
      nowSec: 1700000000,
    });
    expect(verified.ok).toBe(true);
    expect(verified.authorization).toBe(false);

    const kit = {
      options: { partnerId: "acme" },
      fetchPublicReceipt: async () => ({ ok: true, receipt: { receipt_id: "dr_1", currently_valid: false } }),
      evaluateFetchedReceipt: () => ({ outcome: "denied", currently_valid: false, errors: ["expired"] }),
    };
    const follow = await verifyWebhookThenReceipt({
      kit: kit as never,
      secret,
      timestamp,
      rawBody,
      signatureHeader: signature,
      seenEventIds: new Set(),
      nowSec: 1700000000,
    });
    expect(follow.grant).toBe(false);
    expect(permitProtocolAction(follow.receipt as never)).toBe(false);
  });
});
