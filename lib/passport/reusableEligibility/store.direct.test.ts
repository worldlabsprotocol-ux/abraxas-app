import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const postgrestMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: postgrestMock,
  SupabaseAdminConfigurationError: class extends Error {},
}));

import { recordDerivation, revokeDerivedFromSourceReceipt } from "./store";
import type { InternalReusableFact } from "./contract";

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

describe("reusable derivation transactional persistence", () => {
  beforeEach(() => {
    queryMock.mockReset();
    postgrestMock.mockClear();
  });
  const fact = {
    fact_id: "fact-source", source_decision_id: "00000000-0000-4000-8000-000000000003",
    source_receipt_id: "dr-source", subject_pseudonym_id: "subject-pseudonym",
    pack_id: "age_21", policy_version: 1, minimum_assurance: "L2",
    result_category: "eligible", decision_context: "sandbox_only",
    issued_at: "2026-11-01T00:00:00Z", expires_at: null, status: "active",
  } as InternalReusableFact;
  const input = {
    fact, derivedReceiptId: "dr-derived", derivedDecisionId: "00000000-0000-4000-8000-000000000004",
    requestingPartnerId: "partner-a", requestingPolicyId: "policy-a",
    requestingPolicyVersion: 2, verifyRequestId: "00000000-0000-4000-8000-000000000005",
  };

  it("requires the issuance transaction before writing provenance", async () => {
    await expect(recordDerivation(input)).rejects.toThrow("reusable_derivation_transaction_required");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("writes fact and derivation through the supplied transaction", async () => {
    const client = { query: vi.fn(async (sql: string) => ({ rows:
      sql.includes("select source_decision_id")
        ? [{ source_decision_id: fact.source_decision_id,
          source_receipt_id: fact.source_receipt_id,
          subject_pseudonym_id: fact.subject_pseudonym_id,
          status: "active", revoked_at: null }]
        : sql.includes("returning derived_receipt_id")
          ? [{ derived_receipt_id: input.derivedReceiptId }] : [],
    })) };
    await recordDerivation(input, client);
    expect(client.query).toHaveBeenCalledTimes(3);
    expect(queryMock).not.toHaveBeenCalled();
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
