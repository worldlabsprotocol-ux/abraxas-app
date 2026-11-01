import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn(async (fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
  fn({ query: queryMock })));
const postgrestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({
  queryAbraxasPg: queryMock,
  withAbraxasPgTransaction: transactionMock,
}));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: postgrestMock }));

import { createPrivacyRequest, listPrivacyRequestsForSubject } from "./privacyControlPlane";

const subject = `abx_hs_${"a".repeat(32)}`;

describe("sovereign Passport privacy requests", () => {
  beforeEach(() => {
    queryMock.mockReset();
    postgrestMock.mockClear();
  });
  it("lists only the authenticated holder without consulting PostgREST", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(listPrivacyRequestsForSubject(subject)).resolves.toEqual([]);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([subject]);
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("does not create a request for a missing or suspended holder", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(createPrivacyRequest({ subjectSui: subject, requestType: "data_export" }))
      .resolves.toEqual({ ok: false, error: "canonical_holder_required" });
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
