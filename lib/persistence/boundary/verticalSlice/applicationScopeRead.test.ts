import { describe, expect, it, vi } from "vitest";

const querySovereignStagingPg = vi.hoisted(() => vi.fn());

vi.mock("../sovereignStagingPg.runtime", () => ({
  querySovereignStagingPg,
}));

import { evaluateApplicationScopeOnSovereignPg } from "./applicationScopeRead";

const mockQuery = querySovereignStagingPg;

describe("evaluateApplicationScopeOnSovereignPg", () => {
  it("skips enforcement when expectedApplicationId is omitted", async () => {
    mockQuery.mockReset();
    const result = await evaluateApplicationScopeOnSovereignPg({
      receiptId: "dr_1",
      partnerId: "partner-a",
    });
    expect(result.scope_required).toBe(false);
    expect(result.application_scope_satisfied).toBe(true);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("denies unknown application with application_unbound", async () => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await evaluateApplicationScopeOnSovereignPg({
      receiptId: "dr_1",
      partnerId: "partner-a",
      expectedApplicationId: "00000000-0000-4000-8000-000000000001",
    });
    expect(result.application_scope_satisfied).toBe(false);
    expect(result.reasons).toContain("application_unbound");
  });
});
