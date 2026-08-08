import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listFailedWebhookDeliveries,
  requeueFailedWebhookDelivery,
} from "@/lib/partner/webhooks/webhookDeadLetter";

const fromMock = vi.fn();
const isEnabledMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

vi.mock("@/lib/partner/webhooks/webhookOutbox", () => ({
  isPartnerWebhookEnabled: (...args: unknown[]) => isEnabledMock(...args),
}));

describe("webhook dead-letter recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
    isEnabledMock.mockReset();
  });

  it("lists failed deliveries without payload fields", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table !== "partner_webhook_outbox") return {};
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{
                  id: "outbox-1",
                  partner_id: "partner-a",
                  event_type: "partner.receipt.issued",
                  event_id: "evt-1",
                  last_error_code: "timeout",
                  attempt_count: 6,
                  occurred_at: "2026-01-01T00:00:00.000Z",
                  updated_at: "2026-01-02T00:00:00.000Z",
                  payload: { email: "hidden@example.com" },
                }],
              }),
            }),
          }),
        }),
      };
    });

    const rows = await listFailedWebhookDeliveries();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      outbox_id: "outbox-1",
      event_id: "evt-1",
      last_error_code: "timeout",
    });
    expect(JSON.stringify(rows[0])).not.toContain("payload");
    expect(JSON.stringify(rows[0])).not.toContain("@");
  });

  it("requeues failed event with same event_id and audits retry", async () => {
    isEnabledMock.mockResolvedValue(true);

    const updateEqMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { event_id: "evt-1" } }),
      }),
    });

    const auditInsertMock = vi.fn().mockResolvedValue({});

    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_outbox") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "outbox-1",
                  partner_id: "partner-a",
                  event_type: "partner.receipt.issued",
                  event_id: "evt-1",
                  status: "failed",
                  last_error_code: "http_500",
                  attempt_count: 6,
                  payload: { event_id: "evt-1" },
                },
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ eq: updateEqMock }),
          }),
        };
      }
      if (table === "partner_webhook_retry_audit") {
        return { insert: auditInsertMock };
      }
      return {};
    });

    const result = await requeueFailedWebhookDelivery({ outboxId: "outbox-1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.event_id).toBe("evt-1");
    expect(auditInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_id: "evt-1",
      partner_id: "partner-a",
      prior_attempt_count: 6,
    }));
  });

  it("refuses retry when endpoint delivery is disabled", async () => {
    isEnabledMock.mockResolvedValue(false);
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "outbox-1",
              partner_id: "partner-a",
              event_type: "partner.receipt.issued",
              event_id: "evt-1",
              status: "failed",
              last_error_code: "http_500",
              attempt_count: 6,
            },
          }),
        }),
      }),
    }));

    const result = await requeueFailedWebhookDelivery({ outboxId: "outbox-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("webhook_disabled");
  });

  it("does not create a new outbox row on retry", async () => {
    isEnabledMock.mockResolvedValue(true);
    const insertMock = vi.fn();
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_webhook_outbox") {
        return {
          insert: insertMock,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "outbox-1",
                  partner_id: "partner-a",
                  event_type: "partner.receipt.issued",
                  event_id: "evt-1",
                  status: "failed",
                  last_error_code: "timeout",
                  attempt_count: 3,
                },
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { event_id: "evt-1" } }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "partner_webhook_retry_audit") {
        return { insert: vi.fn().mockResolvedValue({}) };
      }
      return {};
    });

    await requeueFailedWebhookDelivery({ outboxId: "outbox-1" });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
