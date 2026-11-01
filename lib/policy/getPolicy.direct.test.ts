import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const postgrestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: postgrestMock }));

import { getPartnerPolicy, getPartnerPolicyAtVersion } from "./getPolicy";

describe("sovereign policy lookup", () => {
  beforeEach(() => { queryMock.mockReset(); postgrestMock.mockClear(); });

  it("loads only an active policy for new requests", async () => {
    queryMock.mockResolvedValue({ rows: [{ policy: { id: "policy-a", version: 2, status: "active" } }] });
    await expect(getPartnerPolicy("policy-a")).resolves.toMatchObject({ version: 2 });
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("p.status = 'active'");
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["policy-a"]);
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("loads the exact pinned version for an existing request", async () => {
    queryMock.mockResolvedValue({ rows: [{ policy: { id: "policy-a", version: 1, status: "deprecated" } }] });
    await expect(getPartnerPolicyAtVersion("policy-a", 1)).resolves.toMatchObject({ version: 1 });
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["policy-a", 1]);
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("does not fall back when direct PostgreSQL is unavailable", async () => {
    queryMock.mockRejectedValue(new Error("database_unavailable"));
    await expect(getPartnerPolicy("policy-a")).rejects.toThrow("database_unavailable");
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
