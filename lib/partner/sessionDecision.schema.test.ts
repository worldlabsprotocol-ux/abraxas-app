import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  findDecisionByIdempotencyKey,
  supersedeActiveSessionDecisions,
} from "@/lib/partner/sessionDecision";
import {
  markVerificationDecisionIdempotencyKeyAbsent,
  markVerificationDecisionIdempotencyKeyAvailable,
  resetVerificationDecisionSchemaProbeForTests,
} from "@/lib/partner/verificationDecisionsSchema";

const selectMock = vi.fn();
const updateMock = vi.fn();
const eqChain = {
  eq: vi.fn(),
  is: vi.fn(),
  gt: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
};

function resetChain() {
  eqChain.eq.mockReturnValue(eqChain);
  eqChain.is.mockReturnValue(eqChain);
  eqChain.gt.mockReturnValue(eqChain);
  eqChain.order.mockReturnValue(eqChain);
  eqChain.limit.mockReturnValue(eqChain);
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        selectMock(...args);
        return eqChain;
      },
      update: (...args: unknown[]) => {
        updateMock(...args);
        return eqChain;
      },
    }),
  }),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptByDecisionId: vi.fn(),
}));

describe("sessionDecision schema compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVerificationDecisionSchemaProbeForTests();
    resetChain();
  });

  it("skips idempotency_key lookup before migration 053", async () => {
    markVerificationDecisionIdempotencyKeyAbsent();
    await expect(findDecisionByIdempotencyKey("pf_session:a:b:c")).resolves.toBeNull();
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("queries idempotency_key when migration 053 is applied", async () => {
    markVerificationDecisionIdempotencyKeyAvailable();
    eqChain.maybeSingle.mockResolvedValue({
      data: {
        id: "vd-1",
        partner_id: "partner",
        subject_id: "subject",
        policy_id: "policy",
        request_id: null,
        idempotency_key: "pf_session:partner:subject:policy",
        valid_until: "2099-01-01T00:00:00.000Z",
        status: "active",
      },
      error: null,
    });

    const result = await findDecisionByIdempotencyKey("pf_session:partner:subject:policy");
    expect(result?.decision_id).toBe("vd-1");
    expect(selectMock).toHaveBeenCalledWith(
      "id, partner_id, subject_id, policy_id, request_id, idempotency_key, valid_until, status",
    );
  });

  it("falls back when lookup hits missing-column error at runtime", async () => {
    markVerificationDecisionIdempotencyKeyAvailable();
    eqChain.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "42703", message: 'column "idempotency_key" does not exist' },
    });

    await expect(findDecisionByIdempotencyKey("pf_session:a:b:c")).resolves.toBeNull();
    await expect(findDecisionByIdempotencyKey("pf_session:a:b:c")).resolves.toBeNull();
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces unexpected Supabase lookup errors", async () => {
    markVerificationDecisionIdempotencyKeyAvailable();
    eqChain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(findDecisionByIdempotencyKey("pf_session:a:b:c")).rejects.toThrow("database unavailable");
  });

  it("supersedes session decisions without updated_at on known schema", async () => {
    eqChain.is.mockImplementation(() => Promise.resolve({ error: null }));

    await supersedeActiveSessionDecisions({
      partnerId: "partner",
      subjectId: "subject",
      policyId: "policy",
    });

    expect(updateMock).toHaveBeenCalledWith({ status: "superseded" });
    const updatePayload = updateMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updatePayload).not.toHaveProperty("updated_at");
  });

  it("surfaces unexpected Supabase errors on supersede", async () => {
    eqChain.is.mockImplementation(() => Promise.resolve({ error: { message: "write failed" } }));

    await expect(
      supersedeActiveSessionDecisions({
        partnerId: "partner",
        subjectId: "subject",
        policyId: "policy",
      }),
    ).rejects.toThrow("write failed");
  });
});
