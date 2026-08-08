import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  enqueuePartnerWebhookEvent,
  enqueuePartnerWebhookEventBestEffort,
} from "@/lib/partner/webhooks/webhookOutbox";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

describe("webhook outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
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
});
