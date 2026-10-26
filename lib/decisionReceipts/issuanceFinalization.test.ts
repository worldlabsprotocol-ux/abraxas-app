import { describe, expect, it } from "vitest";
import type { DecisionReceiptRecord } from "./types";
import {
  isReceiptIssuanceAuthorizable,
  isReceiptIssuanceFinalized,
  isReceiptPendingEvidenceFinalization,
} from "./issuanceFinalization";

function base(overrides: Partial<DecisionReceiptRecord>): DecisionReceiptRecord {
  return {
    id: "dr_test",
    verification_decision_id: "00000000-0000-4000-8000-000000000001",
    consent_receipt_id: null,
    partner_id: "partner",
    policy_id: "pol",
    policy_version: 1,
    subject_pseudonym_id: "psr",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-01-01T00:00:00.000Z",
    expires_at: null,
    revoked_at: null,
    status: "active",
    schema_version: "1.0.0",
    payload_hash: "abc",
    signature: "sig",
    signing_key_id: "key",
    anchor_reference: null,
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("issuance finalization contract", () => {
  it("treats pending_finalization as never authorizable", () => {
    const r = base({ status: "pending_finalization", issuance_finalized_at: null });
    expect(isReceiptPendingEvidenceFinalization(r)).toBe(true);
    expect(isReceiptIssuanceFinalized(r)).toBe(false);
    expect(isReceiptIssuanceAuthorizable(r)).toBe(false);
  });

  it("requires issuance_finalized_at for new active receipts", () => {
    const r = base({ status: "active", issuance_finalized_at: null });
    expect(isReceiptIssuanceAuthorizable(r)).toBe(false);
  });

  it("accepts finalized active receipts", () => {
    const r = base({
      status: "active",
      issuance_finalized_at: "2026-01-01T00:00:01.000Z",
    });
    expect(isReceiptIssuanceAuthorizable(r)).toBe(true);
  });

  it("preserves legacy active without column", () => {
    const r = base({ status: "active" });
    delete (r as { issuance_finalized_at?: string }).issuance_finalized_at;
    expect(isReceiptIssuanceAuthorizable(r)).toBe(true);
  });
});
