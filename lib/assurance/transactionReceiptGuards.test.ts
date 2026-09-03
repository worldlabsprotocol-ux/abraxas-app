// FILE: lib/assurance/transactionReceiptGuards.test.ts

import { describe, expect, it } from "vitest";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";

function basePayload(overrides: Partial<DecisionReceiptCanonicalPayload> = {}): DecisionReceiptCanonicalPayload {
  return buildCanonicalPayload({
    receipt_id: "dr_test_001",
    decision_id: "dec_001",
    policy_id: "good-trouble-retail-v1",
    policy_version: 1,
    partner_id: "good-trouble-cannabis",
    subject_pseudonym_id: "subj_pseudo_abc",
    wallet_binding_ref: "wb_ref",
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-01-01T01:00:00.000Z",
    ...overrides,
  });
}

describe("transaction receipt binding guards", () => {
  it("binds receipts to policy id and version", () => {
    const a = basePayload({ policy_id: "policy-a", policy_version: 1 });
    const b = basePayload({ policy_id: "policy-b", policy_version: 1 });
    expect(a.policy_id).not.toBe(b.policy_id);
    expect(a.policy_version).toBe(1);
  });

  it("includes partner and subject pseudonym binding", () => {
    const payload = basePayload({ partner_id: "partner-x", subject_pseudonym_id: "pseudo-1" });
    expect(payload.partner_id).toBe("partner-x");
    expect(payload.subject_pseudonym_id).toBe("pseudo-1");
    expect(JSON.stringify(payload)).not.toMatch(/0x[a-f0-9]{8,}/i);
  });

  it("uses short-lived expiry for transaction receipts", () => {
    const payload = basePayload({
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-01-01T00:15:00.000Z",
    });
    const evaluated = Date.parse(payload.evaluated_at);
    const expires = Date.parse(payload.expires_at ?? "");
    expect(expires - evaluated).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("does not embed PII fields in canonical receipt payload", () => {
    const payload = basePayload();
    const serialized = JSON.stringify(payload).toLowerCase();
    expect(serialized).not.toMatch(/date_of_birth|passport_image|document_number|legal_name/);
  });

  it("fails partner audience mismatch during trust evaluation", () => {
    const result = evaluatePublicReceiptTrust(
      {
        signature_valid: true,
        decision_result: "approved",
        status: "active",
        expires_at: "2099-01-01T00:00:00.000Z",
        production_usable: true,
        partner_id: "partner-a",
        policy_id: "good-trouble-retail-v1",
      },
      { partnerId: "partner-b", policyId: "good-trouble-retail-v1" },
    );
    expect(result.currently_valid).toBe(false);
    expect(result.validity).toBe("partner_mismatch");
  });

  it("binds receipts to verification request via decision_id", () => {
    const payload = basePayload({ decision_id: "dec_flow_bound_001" });
    expect(payload.decision_id).toBe("dec_flow_bound_001");
    expect(payload.receipt_id).toMatch(/^dr_/);
  });
});
