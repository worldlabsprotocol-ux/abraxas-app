import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const legacyMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: legacyMock }));

import { getReceiptDependencies, recordReceiptClaimDependencies } from "./dependencies";

describe("sovereign receipt claim dependencies", () => {
  beforeEach(() => {
    queryMock.mockReset();
    legacyMock.mockClear();
  });

  it("persists claim bindings in PostgreSQL and reads them without PostgREST", async () => {
    const claimId = "00000000-0000-4000-8000-0000000000aa";
    queryMock.mockResolvedValueOnce({ rows: [{
      claim_id: claimId, claim_type: "identity_verified", issuer_id: "issuer-a",
      signing_key_id: null, created_at: "2026-11-01T00:00:00Z",
    }] });
    const transactionQuery = vi.fn().mockResolvedValue({ rows: [] });
    await recordReceiptClaimDependencies("dr_test", [{
      claim_id: claimId, claim_type: "identity_verified", issuer_id: "issuer-a",
      status: "active", issued_at: "2026-01-01T00:00:00Z", expires_at: null,
    }], undefined, { query: transactionQuery });
    const rows = await getReceiptDependencies("dr_test");
    expect(rows).toHaveLength(1);
    expect(transactionQuery.mock.calls[0][0]).toContain("on conflict (receipt_id, claim_id) do nothing");
    expect(queryMock.mock.calls[0][1]).toEqual(["dr_test"]);
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("fails closed when the authoritative read fails", async () => {
    queryMock.mockRejectedValue(new Error("storage unavailable"));
    await expect(getReceiptDependencies("dr_test")).rejects.toThrow("storage unavailable");
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("requires the caller's receipt issuance transaction for dependency writes", async () => {
    await expect(recordReceiptClaimDependencies("dr_test", [{
      claim_id: "00000000-0000-4000-8000-0000000000aa",
      claim_type: "identity_verified", issuer_id: "issuer-a",
      status: "active", issued_at: "2026-01-01T00:00:00Z", expires_at: null,
    }])).rejects.toThrow("receipt_dependency_transaction_required");
    expect(queryMock).not.toHaveBeenCalled();
  });
});
