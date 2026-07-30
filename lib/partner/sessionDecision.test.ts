import { describe, expect, it, vi, beforeEach } from "vitest";
import { findActiveSessionDecision } from "@/lib/partner/sessionDecision";

const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockIs = vi.fn(() => ({ gt: vi.fn(() => ({ order: mockOrder })) }));
const mockEqChain = {
  eq: vi.fn(function (this: unknown) { return mockEqChain; }),
  is: mockIs,
};

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => mockEqChain,
    }),
  }),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptByDecisionId: vi.fn(),
}));

describe("P0-RCP-1: session decision idempotency lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no active session decision exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    const result = await findActiveSessionDecision({
      partnerId: "good-trouble-cannabis",
      subjectId: "0xabc",
      policyId: "good-trouble-retail-v1",
    });
    expect(result).toBeNull();
  });

  it("returns existing decision and receipt when session is still valid", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "vd_existing",
        valid_until: new Date(Date.now() + 3600_000).toISOString(),
        status: "active",
      },
    });
    const { getReceiptByDecisionId } = await import("@/lib/decisionReceipts/service");
    vi.mocked(getReceiptByDecisionId).mockResolvedValue({
      id: "dr_existing",
    } as Awaited<ReturnType<typeof getReceiptByDecisionId>>);

    const result = await findActiveSessionDecision({
      partnerId: "good-trouble-cannabis",
      subjectId: "0xabc",
      policyId: "good-trouble-retail-v1",
    });

    expect(result).toEqual({
      decision_id: "vd_existing",
      receipt_id: "dr_existing",
      receipt_expires_at: expect.any(String),
    });
  });
});
