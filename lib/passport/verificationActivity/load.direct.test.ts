import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const postgrestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: postgrestMock }));

import { loadPassportVerificationActivity } from "./load";

describe("sovereign Passport activity", () => {
  it("reads only the authenticated subject from PostgreSQL without a PostgREST fallback", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const subjectId = `abx_hs_${"a".repeat(32)}`;
    const view = await loadPassportVerificationActivity(subjectId);
    expect(view.items).toEqual([]);
    expect(queryMock).toHaveBeenCalledOnce();
    expect(queryMock.mock.calls[0]?.[1]?.[0]).toBe(subjectId);
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("where d.subject_id = $1");
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("fails closed when the sovereign decision store is unavailable", async () => {
    queryMock.mockRejectedValueOnce(new Error("database_unavailable"));
    await expect(loadPassportVerificationActivity(`abx_hs_${"b".repeat(32)}`))
      .rejects.toThrow("database_unavailable");
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
