import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

import { loadPassportVerificationActivity } from "@/lib/passport/verificationActivity/load";

const SUBJECT = "0x" + "c".repeat(64);
const OTHER = "0x" + "d".repeat(64);

function thenable<T>(value: T) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.gte = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.in = vi.fn(self);
  chain.then = (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(resolve, reject);
  return chain;
}

describe("loadPassportVerificationActivity", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("scopes verification_decisions to the session subject only", async () => {
    const decisions = thenable({ data: [], error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "verification_decisions") return decisions;
      return thenable({ data: [], error: null });
    });

    const view = await loadPassportVerificationActivity(SUBJECT);
    expect(view.items).toEqual([]);
    expect(fromMock).toHaveBeenCalledWith("verification_decisions");
    expect(decisions.eq).toHaveBeenCalledWith("subject_id", SUBJECT);
    expect(decisions.eq).not.toHaveBeenCalledWith("subject_id", OTHER);
    const select = decisions.select as ReturnType<typeof vi.fn>;
    const selected = String(select.mock.calls[0]?.[0] ?? "");
    expect(selected).not.toMatch(/claims_json|signature|email|legal_name/);
  });

  it("fails closed when the decision store errors", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "verification_decisions") return thenable({ data: null, error: { message: "SQLSTATE 42P01" } });
      return thenable({ data: [], error: null });
    });
    await expect(loadPassportVerificationActivity(SUBJECT)).rejects.toThrow("unavailable");
  });

  it("continues when receipts are missing so history still projects from decisions", async () => {
    const decisions = thenable({
      data: [{
        id: "dec-1",
        partner_id: "unknown-partner",
        policy_id: "age_18_retail",
        policy_version: 1,
        decision: "approved",
        decided_at: "2026-09-19T12:00:00.000Z",
        valid_until: "2026-12-01T00:00:00.000Z",
        status: "active",
        request_id: "req-1",
      }],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "verification_decisions") return decisions;
      if (table === "decision_receipts") return thenable({ data: null, error: { message: "missing" } });
      if (table === "verification_requests") return thenable({ data: [], error: null });
      return thenable({ data: [], error: null });
    });
    const view = await loadPassportVerificationActivity(SUBJECT);
    expect(view.items).toHaveLength(1);
    expect(view.items[0].state).toBe("approved");
    expect(JSON.stringify(view)).not.toContain("dec-1");
  });
});
