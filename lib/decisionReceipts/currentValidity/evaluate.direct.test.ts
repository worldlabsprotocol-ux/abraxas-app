import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const queryMock = vi.hoisted(() => vi.fn());
const legacyMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: legacyMock }));
vi.mock("@/lib/decisionReceipts/views.server", () => ({
  verifyRecordSignature: () => true,
  resolveReceiptStatus: () => "active",
}));
vi.mock("@/lib/decisionReceipts/trustEvaluation.server", () => ({
  evaluateDecisionReceiptTrust: legacyMock,
}));

import { evaluateReceiptCurrentValidity } from "./evaluate";

const record = {
  id: "dr_withdrawn",
  partner_id: "partner-a",
  policy_id: "partner-a-age_21-v1",
  policy_version: 1,
  decision_result: "approved",
} as DecisionReceiptRecord;

describe("sovereign current validity after withdrawal", () => {
  beforeEach(() => {
    queryMock.mockReset();
    legacyMock.mockClear();
  });

  it("rejects a stale signed receipt when authoritative PostgreSQL says revoked", async () => {
    queryMock.mockResolvedValue({ rows: [{
      receipt_status: "revoked", receipt_revoked_at: "2026-11-01T00:00:00Z",
      decision_status: "revoked", consent_revoked_at: null,
    }] });
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(result).toMatchObject({
      currently_valid: false,
      lifecycle_status: "revoked",
      partner_safe_reason: "receipt_revoked",
      invalidation_reasons: ["receipt_revoked"],
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("public.decision_receipts"), [record.id]);
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("rejects a revoked consent even if the receipt row is still active", async () => {
    queryMock.mockResolvedValue({ rows: [{
      receipt_status: "active", receipt_revoked_at: null,
      decision_status: "active", consent_revoked_at: "2026-11-01T00:00:00Z",
    }] });
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(result.currently_valid).toBe(false);
    expect(result.invalidation_reasons).toContain("receipt_revoked");
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("fails closed when authoritative status cannot be read", async () => {
    queryMock.mockRejectedValue(new Error("database unavailable"));
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(result).toMatchObject({
      currently_valid: false,
      lifecycle_status: "invalidated",
      partner_safe_reason: "verification_incomplete",
      invalidation_reasons: ["validity_store_unavailable"],
    });
    expect(legacyMock).not.toHaveBeenCalled();
  });
});
