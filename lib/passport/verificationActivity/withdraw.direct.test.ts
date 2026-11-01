import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const postgrestMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({
  queryAbraxasPg: queryMock,
  withAbraxasPgTransaction: transactionMock,
}));
vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: postgrestMock,
  SupabaseAdminConfigurationError: class extends Error {},
}));
vi.mock("@/lib/decisionReceipts/revocationControlPlane", () => ({
  revokeDecisionReceiptControlled: postgrestMock,
}));
vi.mock("@/lib/passport/reusableEligibility/store", () => ({
  revokeDerivedFromSourceReceipt: postgrestMock,
}));
vi.mock("@/lib/partner/receiptLifecycle", () => ({
  enqueueDerivedInvalidationEvents: postgrestMock,
}));

import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { opaqueActivityRef } from "./view";
import { withdrawHolderSharedResult } from "./withdraw";

const subjectId = `abx_hs_${"a".repeat(32)}`;
const decisionId = "00000000-0000-4000-8000-0000000000aa";
const receiptId = "dr_sovereign_holder_test";
const activityRef = opaqueActivityRef(subjectId, decisionId);

function activity(receiptStatus = "active") {
  return {
    decision_id: decisionId, receipt_id: receiptId, partner_id: "partner-a",
    policy_id: "partner-age_21-v1", policy_version: 1,
    decision: "approved", decided_at: new Date().toISOString(), valid_until: null,
    decision_status: "active", receipt_status: receiptStatus,
    receipt_context: "production", receipt_expires_at: null,
    receipt_revoked_at: receiptStatus === "revoked" ? new Date().toISOString() : null,
  };
}

describe("sovereign holder withdrawal", () => {
  beforeEach(() => {
    queryMock.mockReset();
    transactionMock.mockReset();
    postgrestMock.mockClear();
  });

  it("atomically revokes the bound receipt, descendants, facts, and writes an audit record", async () => {
    queryMock.mockResolvedValue({ rows: [activity()] });
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    transactionMock.mockImplementation(async (fn: (client: { query: typeof queryMock }) => Promise<unknown>) => fn({
      query: (async (sql: string, params: unknown[] = []) => {
        statements.push({ sql, params });
        if (sql.includes("from public.verification_decisions d")) return { rows: [{ id: receiptId, status: "active", revoked_at: null }] };
        if (sql.includes("revoke_decision_receipt_atomic")) return { rows: [{ result: { ok: true } }] };
        if (sql.includes("from public.reusable_eligibility_derivations")) {
          return { rows: params[0] === receiptId ? [{ derived_receipt_id: "dr_derived" }] : [] };
        }
        if (sql.includes("from public.decision_receipts where id")) return { rows: [{ status: "active", revoked_at: null }] };
        return { rows: [] };
      }) as typeof queryMock,
    }));

    const result = await withdrawHolderSharedResult({ subjectId, activityRef });
    expect(result).toMatchObject({ ok: true, view: { state: "revoked", already_withdrawn: false } });
    expect(statements[0]?.params).toEqual([decisionId, subjectId, receiptId, subjectPseudonymId(subjectId)]);
    expect(statements.filter((item) => item.sql.includes("revoke_decision_receipt_atomic"))).toHaveLength(2);
    expect(statements.some((item) => item.sql.includes("update public.reusable_eligibility_facts"))).toBe(true);
    expect(statements.some((item) => item.sql.includes("insert into public.audit_events"))).toBe(true);
    expect(postgrestMock).not.toHaveBeenCalled();
  });

  it("rejects another holder's activity before mutation", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const result = await withdrawHolderSharedResult({ subjectId: `abx_hs_${"b".repeat(32)}`, activityRef });
    expect(result).toMatchObject({ ok: false, error: "not_found", status: 404 });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("fails closed when a descendant cannot be invalidated", async () => {
    queryMock.mockResolvedValue({ rows: [activity()] });
    transactionMock.mockImplementation(async (fn: (client: { query: typeof queryMock }) => Promise<unknown>) => fn({
      query: (async (sql: string, params: unknown[] = []) => {
        if (sql.includes("from public.verification_decisions d")) return { rows: [{ id: receiptId, status: "active", revoked_at: null }] };
        if (sql.includes("revoke_decision_receipt_atomic")) {
          return { rows: [{ result: { ok: params[0] === receiptId } }] };
        }
        if (sql.includes("from public.reusable_eligibility_derivations")) return { rows: [{ derived_receipt_id: "dr_derived" }] };
        if (sql.includes("from public.decision_receipts where id")) return { rows: [{ status: "active", revoked_at: null }] };
        return { rows: [] };
      }) as typeof queryMock,
    }));
    const result = await withdrawHolderSharedResult({ subjectId, activityRef });
    expect(result).toMatchObject({ ok: false, error: "unavailable", status: 503 });
    expect(postgrestMock).not.toHaveBeenCalled();
  });
});
