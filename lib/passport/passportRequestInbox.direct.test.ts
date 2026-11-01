import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const postgrestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: postgrestMock }));

import { listPassportRequestInbox } from "./passportRequestInbox";

describe("sovereign Passport request inbox", () => {
  it("requires an authenticated canonical subject and a matching active policy", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{
      id: "a1825a6c-e483-478c-b395-1f036be313c8",
      partner_id: "good-trouble",
      policy_id: "good-trouble-age_21_retail-v1",
      policy_name: "Age 21 eligibility",
      requested_action: "browse_storefront",
      created_at: "2026-10-31T10:00:00Z",
      expires_at: "2026-11-01T10:00:00Z",
    }] });
    const subjectId = `abx_hs_${"a".repeat(32)}`;
    const items = await listPassportRequestInbox(subjectId);
    expect(items).toHaveLength(1);
    expect(items[0]?.request_title).toBe("Age 21 eligibility");
    expect(queryMock.mock.calls[0]?.[1]).toEqual([subjectId]);
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("p.partner_id = r.partner_id");
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("p.version = r.policy_version");
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("does not fall back to PostgREST on a sovereign store error", async () => {
    queryMock.mockRejectedValueOnce(new Error("database_unavailable"));
    await expect(listPassportRequestInbox(`abx_hs_${"b".repeat(32)}`))
      .rejects.toThrow("database_unavailable");
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
