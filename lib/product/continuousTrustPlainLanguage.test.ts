import { describe, expect, it } from "vitest";
import { buildDecisionReceiptDisplayModel } from "@/lib/protocol/decisionReceiptDisplay";
import { buildContinuousTrustFactors, summarizeContinuousTrust } from "@/lib/product/continuousTrustPlainLanguage";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";

function sample(overrides: Partial<DecisionReceiptPublicView> = {}): DecisionReceiptPublicView {
  return {
    receipt_id: "dr_trust_test",
    schema_version: "1.0.0",
    policy_id: "partner-age_21_retail-v1",
    policy_version: 1,
    partner_id: "good-trouble",
    subject_pseudonym_id: "subj",
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    production_usable: true,
    evaluated_at: "2026-09-30T12:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "key",
    signature_valid: true,
    anchor_reference: null,
    artifact_type: "eligibility_decision_receipt",
    currently_valid: true,
    lifecycle_status: "active",
    partner_safe_reason: null,
    ...overrides,
  };
}

describe("continuousTrustPlainLanguage", () => {
  it("marks expired receipts as failing lifetime factor", () => {
    const model = buildDecisionReceiptDisplayModel(
      sample({ status: "expired", lifecycle_status: "expired", currently_valid: false }),
    );
    const factors = buildContinuousTrustFactors(model);
    expect(factors.find((f) => f.id === "lifetime")?.ok).toBe(false);
    expect(summarizeContinuousTrust(model)).toMatch(/expired/i);
  });

  it("explains verified receipts still depend on more than signature", () => {
    const model = buildDecisionReceiptDisplayModel(sample(), { actionPermitted: true });
    expect(summarizeContinuousTrust(model)).toMatch(/signature alone/i);
  });
});
