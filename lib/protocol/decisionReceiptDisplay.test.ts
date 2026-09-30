import { describe, expect, it } from "vitest";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  buildDecisionReceiptDisplayModel,
  humanizeDisclosedResult,
  normalizeReceiptDisplaySource,
  partnerSafeDenialMessage,
  receiptDisplayProhibitsIdentityFields,
  resolveReceiptVisualStatus,
} from "@/lib/protocol/decisionReceiptDisplay";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";

function sampleReceipt(overrides: Partial<DecisionReceiptPublicView> = {}): DecisionReceiptPublicView {
  return {
    receipt_id: "dr_test_001",
    schema_version: "1.0.0",
    policy_id: "partner-age_21_retail-v1",
    policy_version: 1,
    partner_id: "good-trouble",
    subject_pseudonym_id: "subj_abc",
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    production_usable: true,
    evaluated_at: "2026-09-30T12:00:00.000Z",
    expires_at: "2026-10-01T12:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "key_primary",
    signature_valid: true,
    anchor_reference: null,
    artifact_type: "eligibility_decision_receipt",
    currently_valid: true,
    lifecycle_status: "active",
    partner_safe_reason: null,
    ...overrides,
  };
}

describe("decisionReceiptDisplay", () => {
  it("maps valid production receipt to verified state", () => {
    const model = buildDecisionReceiptDisplayModel(sampleReceipt(), { actionPermitted: true });
    expect(model.visualStatus).toBe("verified");
    expect(model.environment).toBe("production");
    expect(model.statusLabel).toBe("Verified");
    expect(model.policyVersion).toBe(1);
  });

  it("renders policy_version from DecisionReceiptPublicView", () => {
    const normalized = normalizeReceiptDisplaySource(sampleReceipt({ policy_version: 3 }));
    expect(normalized.policyVersion).toBe(3);
    expect(buildDecisionReceiptDisplayModel(sampleReceipt({ policy_version: 3 })).policyVersion).toBe(3);
  });

  it("builds PartnerFlowPublicReceipt without inventing policy_version", () => {
    const partnerReceipt: PartnerFlowPublicReceipt = {
      receipt_id: "dr_partner_only",
      partner_id: "good-trouble",
      policy_id: "partner-age_21_retail-v1",
      decision_result: "approved",
      signature_valid: true,
      status: "active",
      production_usable: true,
      decision_context: "production",
      expires_at: "2099-01-01T00:00:00.000Z",
      currently_valid: true,
      lifecycle_status: "active",
    };

    const normalized = normalizeReceiptDisplaySource(partnerReceipt);
    expect(normalized.policyVersion).toBeNull();

    const model = buildDecisionReceiptDisplayModel(partnerReceipt, { actionPermitted: true });
    expect(model.policyVersion).toBeNull();
    expect(model.visualStatus).toBe("verified");
    expect(model.evaluatedAt).toBeUndefined();
    expect(model.signingKeyId).toBeUndefined();
  });

  it("uses optional builder policyVersion context when receipt omits it", () => {
    const partnerReceipt: PartnerFlowPublicReceipt = {
      receipt_id: "dr_partner_ctx",
      policy_id: "partner-age_21_retail-v1",
      decision_result: "approved",
      signature_valid: true,
      status: "active",
      currently_valid: true,
    };

    const model = buildDecisionReceiptDisplayModel(partnerReceipt, { policyVersion: 2 });
    expect(model.policyVersion).toBe(2);
  });

  it("keeps verified status when optional technical metadata is absent", () => {
    const partnerReceipt: PartnerFlowPublicReceipt = {
      receipt_id: "dr_partner_minimal",
      policy_id: "partner-age_21_retail-v1",
      decision_result: "approved",
      signature_valid: true,
      status: "active",
      currently_valid: true,
    };

    expect(resolveReceiptVisualStatus(partnerReceipt)).toBe("verified");
    expect(buildDecisionReceiptDisplayModel(partnerReceipt).visualStatus).toBe("verified");
  });

  it("shows sandbox clearly for sandbox receipts", () => {
    const model = buildDecisionReceiptDisplayModel(
      sampleReceipt({
        decision_context: "sandbox_only",
        production_usable: false,
        currently_valid: true,
      }),
    );
    expect(model.visualStatus).toBe("sandbox");
    expect(model.environmentLabel).toBe("Sandbox");
  });

  it("does not display expired receipt as verified", () => {
    const status = resolveReceiptVisualStatus(
      sampleReceipt({
        status: "expired",
        lifecycle_status: "expired",
        currently_valid: false,
        expires_at: "2020-01-01T00:00:00.000Z",
      }),
    );
    expect(status).toBe("expired");
  });

  it("does not display revoked receipt as verified", () => {
    const status = resolveReceiptVisualStatus(
      sampleReceipt({
        status: "revoked",
        lifecycle_status: "revoked",
        currently_valid: false,
        partner_safe_reason: "receipt_revoked",
      }),
    );
    expect(status).toBe("revoked");
  });

  it("maps invalid signature to invalid state", () => {
    const status = resolveReceiptVisualStatus(sampleReceipt({ signature_valid: false }));
    expect(status).toBe("invalid");
  });

  it("uses neutral fail-closed state when validity is unknown", () => {
    const status = resolveReceiptVisualStatus(
      sampleReceipt({
        currently_valid: undefined,
        signature_valid: false,
      }),
    );
    expect(status).toBe("invalid");
  });

  it("renders age_21_retail human-readable result from policy catalog", () => {
    expect(humanizeDisclosedResult(POLICY_PACKS.age_21_retail.disclosed_result)).toBe("21+ verified");
    const model = buildDecisionReceiptDisplayModel(
      sampleReceipt({ policy_id: "partner-age_21_retail-v1" }),
    );
    expect(model.resultLabel).toBe("21+ verified");
  });

  it("keeps prohibited identity fields out of display model serialization", () => {
    const model = buildDecisionReceiptDisplayModel(sampleReceipt());
    expect(receiptDisplayProhibitsIdentityFields(model)).toEqual([]);
  });

  it("derives holder privacy facts from canonical policy truth", () => {
    const model = buildDecisionReceiptDisplayModel(
      sampleReceipt({ policy_id: "partner-age_21_retail-v1" }),
    );
    expect(model.protectedFields.length).toBeGreaterThan(0);
    expect(model.protectedFields.some((field) => /birth|government|legal name|email/i.test(field))).toBe(true);
  });

  it("maps partner denial to safe user message without internal diagnostics", () => {
    expect(partnerSafeDenialMessage("receipt_expired")).toBe("Receipt expired");
    expect(partnerSafeDenialMessage("policy_no_longer_valid")).toBe("Receipt does not match this request");
    expect(partnerSafeDenialMessage("signature_invalid")).toBe("Unable to verify receipt");
    expect(partnerSafeDenialMessage("internal_sql_error")).toBe("Unable to verify receipt");
  });

  it("uses neutral fail-closed state when validity cannot be confirmed", () => {
    const status = resolveReceiptVisualStatus(
      sampleReceipt({
        currently_valid: undefined,
        signature_valid: true,
        decision_result: "approved",
        status: "active",
        expires_at: null,
      }),
    );
    expect(status).toBe("verified");
  });

  it("marks action denial as invalid even when receipt fields look healthy", () => {
    const status = resolveReceiptVisualStatus(sampleReceipt(), { actionPermitted: false });
    expect(status).toBe("invalid");
  });
});
