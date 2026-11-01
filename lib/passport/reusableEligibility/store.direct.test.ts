import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const postgrestMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: postgrestMock,
  SupabaseAdminConfigurationError: class extends Error {},
}));

import { revokeDerivedFromSourceReceipt } from "./store";

const input = {
  sourceReceiptId: "dr_source",
  changedBy: "holder:abx_hs_test",
  reasonCode: "holder_withdrawal",
};

describe("revokeDerivedFromSourceReceipt direct PostgreSQL", () => {
  beforeEach(() => {
    queryMock.mockReset();
    postgrestMock.mockClear();
  });

  it("invokes the in-database revocation function over direct PostgreSQL", async () => {
    queryMock.mockResolvedValue({ rows: [{ result: { ok: true, derived_revoked: 2 } }] });
    const result = await revokeDerivedFromSourceReceipt(input);
    expect(result).toEqual({ ok: true });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("revoke_derived_receipts_for_source"),
      [input.sourceReceiptId, input.reasonCode, input.changedBy],
    );
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("fails closed when the database reports not ok", async () => {
    queryMock.mockResolvedValue({ rows: [{ result: { ok: false } }] });
    const result = await revokeDerivedFromSourceReceipt(input);
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("fails closed when the direct query throws", async () => {
    queryMock.mockRejectedValue(new Error("connection_lost"));
    const result = await revokeDerivedFromSourceReceipt(input);
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
