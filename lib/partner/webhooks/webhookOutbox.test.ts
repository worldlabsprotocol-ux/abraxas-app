import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  consumeLastWebhookEnqueueSkip,
  enqueuePartnerWebhookEvent,
  enqueuePartnerWebhookEventBestEffort,
} from "@/lib/partner/webhooks/webhookOutbox";
import { resetWebhookExtendedEventTypeProbeCache } from "@/lib/partner/eventDelivery/schemaCapability";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

describe("webhook outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
    resetWebhookExtendedEventTypeProbeCache();
    consumeLastWebhookEnqueueSkip();
  });

  it("skips enqueue when webhook disabled", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: false } }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await enqueuePartnerWebhookEvent({
      partnerId: "partner-a",
      eventType: "partner.receipt.issued",
      resourceId: "dr_1",
      receiptId: "dr_1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("webhook_disabled");
  });

  it("returns existing event on idempotent replay", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: true } }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_outbox") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { event_id: "evt-existing" } }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await enqueuePartnerWebhookEvent({
      partnerId: "partner-a",
      eventType: "partner.receipt.issued",
      resourceId: "dr_1",
      receiptId: "dr_1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.eventId).toBe("evt-existing");
    }
  });

  it("best-effort enqueue never throws", () => {
    fromMock.mockImplementation(() => { throw new Error("db_down"); });
    expect(() => enqueuePartnerWebhookEventBestEffort({
      partnerId: "partner-a",
      eventType: "partner.receipt.issued",
      resourceId: "dr_1",
      receiptId: "dr_1",
    })).not.toThrow();
  });

  it("persists issued events as partner.receipt.issued with public payload receipt.issued", async () => {
    let inserted: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: true } }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_outbox") {
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            inserted = row;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "outbox-1",
                    ...row,
                    attempt_count: 0,
                    delivered_at: null,
                    last_error_code: null,
                    created_at: "2026-09-18T00:00:00.000Z",
                    updated_at: "2026-09-18T00:00:00.000Z",
                  },
                  error: null,
                }),
              }),
            };
          }),
        };
      }
      return {};
    });

    const result = await enqueuePartnerWebhookEvent({
      partnerId: "partner-a",
      eventType: "receipt.issued",
      resourceId: "dr_1",
      receiptId: "dr_1",
      policyId: "policy-v1",
      policyVersion: 1,
    });
    expect(result.ok).toBe(true);
    expect(inserted?.event_type).toBe("partner.receipt.issued");
    expect((inserted?.payload as { event_type: string }).event_type).toBe("receipt.issued");
  });

  it("persists revoked events as partner.receipt.revoked with public payload receipt.revoked", async () => {
    let inserted: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: true } }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_outbox") {
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            inserted = row;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "outbox-2",
                    ...row,
                    attempt_count: 0,
                    delivered_at: null,
                    last_error_code: null,
                    created_at: "2026-09-18T00:00:00.000Z",
                    updated_at: "2026-09-18T00:00:00.000Z",
                  },
                  error: null,
                }),
              }),
            };
          }),
        };
      }
      return {};
    });

    const result = await enqueuePartnerWebhookEvent({
      partnerId: "partner-a",
      eventType: "receipt.revoked",
      resourceId: "dr_1",
      receiptId: "dr_1",
    });
    expect(result.ok).toBe(true);
    expect(inserted?.event_type).toBe("partner.receipt.revoked");
    expect((inserted?.payload as { event_type: string }).event_type).toBe("receipt.revoked");
  });

  it("skips unsupported extended event types without treating them as delivered", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: true } }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_outbox") {
        return {
          insert: vi.fn().mockResolvedValue({
            error: { code: "23514", message: "violates check constraint event_type" },
            data: null,
          }),
        };
      }
      return {};
    });

    const result = await enqueuePartnerWebhookEvent({
      partnerId: "partner-a",
      eventType: "decision.denied",
      resourceId: "dec_1",
      decisionId: "dec_1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("event_type_not_supported");
    expect(consumeLastWebhookEnqueueSkip()).toBe("event_type_not_supported");
  });

  it("surfaces persistence failure instead of silent success", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_configs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: true } }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_outbox") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "XX000", message: "internal" },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await enqueuePartnerWebhookEvent({
      partnerId: "partner-a",
      eventType: "partner.receipt.issued",
      resourceId: "dr_1",
      receiptId: "dr_1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("persistence_failed");
    expect(consumeLastWebhookEnqueueSkip()).toBe("persistence_failed");
  });
});
