import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimWebhookOutboxEvent } from "@/lib/partner/webhooks/webhookOutbox";
import { WEBHOOK_DELIVERY_LEASE_MS } from "@/lib/partner/webhooks/types";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: (...args: unknown[]) => fromMock(...args) })),
}));

function makeOutboxRow(overrides: Record<string, unknown> = {}) {
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
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2026-01-01T00:00:00.000Z",
    delivered_at: null,
    last_error_code: null,
    delivery_lease_until: null,
    delivery_worker_id: null,
    delivery_claim_id: null,
    delivery_attempt_number: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildSelectChain(result: Record<string, unknown> | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result }),
  };
}

function buildClaimChain(resultRow: Record<string, unknown> | null) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: resultRow }),
  };
  return chain;
}

describe("webhook outbox worker leases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
  });

  it("claims pending events atomically for one worker", async () => {
    const attemptSelect = buildSelectChain(null);
    const outboxSelect = buildSelectChain({ attempt_count: 0 });
    const pendingChain = buildClaimChain(makeOutboxRow({
      status: "delivering",
      delivery_worker_id: "worker-a",
      delivery_claim_id: "claim-a",
      delivery_attempt_number: 1,
      delivery_lease_until: new Date(Date.now() + WEBHOOK_DELIVERY_LEASE_MS).toISOString(),
    }));
    const expiredChain = buildClaimChain(null);

    fromMock
      .mockImplementationOnce(() => outboxSelect)
      .mockImplementationOnce(() => attemptSelect)
      .mockImplementationOnce(() => pendingChain)
      .mockImplementationOnce(() => expiredChain);

    const claimed = await claimWebhookOutboxEvent({
      outboxId: "outbox-1",
      workerId: "worker-a",
    });

    expect(claimed).not.toBeNull();
    expect(claimed?.delivery_worker_id).toBe("worker-a");
    expect(claimed?.delivery_claim_id).toBe("claim-a");
    expect(pendingChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "delivering",
      delivery_worker_id: "worker-a",
      delivery_attempt_number: 1,
    }));
  });

  it("returns null when another worker already holds an active lease", async () => {
    const attemptSelect = buildSelectChain(null);
    const outboxSelect = buildSelectChain({ attempt_count: 0 });
    const pendingChain = buildClaimChain(null);
    const expiredChain = buildClaimChain(null);

    fromMock
      .mockImplementationOnce(() => outboxSelect)
      .mockImplementationOnce(() => attemptSelect)
      .mockImplementationOnce(() => pendingChain)
      .mockImplementationOnce(() => expiredChain);

    const claimed = await claimWebhookOutboxEvent({
      outboxId: "outbox-1",
      workerId: "worker-b",
    });

    expect(claimed).toBeNull();
  });

  it("reclaims expired delivering leases after worker crash", async () => {
    const expiredLeaseUntil = new Date(Date.now() - WEBHOOK_DELIVERY_LEASE_MS - 1_000).toISOString();
    const attemptSelect = buildSelectChain({ attempt_number: 1 });
    const outboxSelect = buildSelectChain({ attempt_count: 0 });
    const pendingChain = buildClaimChain(null);
    const expiredChain = buildClaimChain(makeOutboxRow({
      status: "delivering",
      delivery_lease_until: expiredLeaseUntil,
      delivery_worker_id: "worker-recovery",
      delivery_claim_id: "claim-b",
      delivery_attempt_number: 2,
    }));

    fromMock
      .mockImplementationOnce(() => outboxSelect)
      .mockImplementationOnce(() => attemptSelect)
      .mockImplementationOnce(() => pendingChain)
      .mockImplementationOnce(() => expiredChain);

    const reclaimed = await claimWebhookOutboxEvent({
      outboxId: "outbox-1",
      workerId: "worker-recovery",
    });

    expect(reclaimed).not.toBeNull();
    expect(reclaimed?.delivery_worker_id).toBe("worker-recovery");
    expect(reclaimed?.delivery_attempt_number).toBe(2);
    expect(expiredChain.eq).toHaveBeenCalledWith("status", "delivering");
    expect(expiredChain.lt).toHaveBeenCalledWith("delivery_lease_until", expect.any(String));
  });
});
