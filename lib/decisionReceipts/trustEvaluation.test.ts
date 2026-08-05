import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  evaluateDecisionReceiptTrustSync,
  evaluatePublicReceiptTrust,
} from "@/lib/decisionReceipts/trustEvaluation";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const TEST_KEY = generateTestSigningKeyPair();

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_trust_eval",
    decision_id: "vd_trust_eval",
    policy_id: "good-trouble-retail-v1",
    policy_version: 1,
    partner_id: "good-trouble-cannabis",
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-07-30T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: payload.decision_result,
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: payload.decision_id,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

describe("trustEvaluation — authoritative fail-closed contract", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("passes approved active production receipt", () => {
    const result = evaluateDecisionReceiptTrustSync(sampleRecord(), {
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    });
    expect(result.currently_valid).toBe(true);
    expect(result.validity).toBe("active");
    expect(result.signature_valid).toBe(true);
  });

  it("fails expired receipt", () => {
    const expiresAt = "2020-01-01T00:00:00.000Z";
    const payload = buildCanonicalPayload({
      receipt_id: "dr_trust_eval_exp",
      decision_id: "vd_trust_eval_exp",
      policy_id: "good-trouble-retail-v1",
      policy_version: 1,
      partner_id: "good-trouble-cannabis",
      subject_pseudonym_id: subjectPseudonymId("0xabc"),
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-07-30T00:00:00.000Z",
      expires_at: expiresAt,
    });
    const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const result = evaluateDecisionReceiptTrustSync(
      sampleRecord({
        id: payload.receipt_id,
        verification_decision_id: payload.decision_id,
        expires_at: expiresAt,
        payload_hash: payloadHash,
        signature,
      }),
      { partnerId: "good-trouble-cannabis", policyId: "good-trouble-retail-v1" },
    );
    expect(result.currently_valid).toBe(false);
    expect(result.validity).toBe("expired");
  });

  it("fails revoked receipt", () => {
    const result = evaluateDecisionReceiptTrustSync(
      sampleRecord({ status: "revoked", revoked_at: "2026-07-30T00:00:00.000Z" }),
      { partnerId: "good-trouble-cannabis", policyId: "good-trouble-retail-v1" },
    );
    expect(result.currently_valid).toBe(false);
    expect(result.invalidation_reasons).toContain("receipt_revoked");
  });

  it("fails invalid signature", () => {
    const result = evaluateDecisionReceiptTrustSync(
      sampleRecord({ signature: "tampered" }),
      { partnerId: "good-trouble-cannabis", policyId: "good-trouble-retail-v1" },
    );
    expect(result.currently_valid).toBe(false);
    expect(result.validity).toBe("signature_invalid");
  });

  it("fails policy mismatch", () => {
    const result = evaluatePublicReceiptTrust(
      {
        signature_valid: true,
        decision_result: "approved",
        status: "active",
        expires_at: "2099-01-01T00:00:00.000Z",
        production_usable: true,
        partner_id: "good-trouble-cannabis",
        policy_id: "other-policy",
      },
      { partnerId: "good-trouble-cannabis", policyId: "good-trouble-retail-v1" },
    );
    expect(result.currently_valid).toBe(false);
    expect(result.validity).toBe("policy_mismatch");
  });

  it("fails manual review decision", () => {
    const result = evaluatePublicReceiptTrust(
      {
        signature_valid: true,
        decision_result: "manual_review",
        status: "active",
        expires_at: "2099-01-01T00:00:00.000Z",
        production_usable: true,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
      },
      { partnerId: "good-trouble-cannabis", policyId: "good-trouble-retail-v1" },
    );
    expect(result.currently_valid).toBe(false);
    expect(result.validity).toBe("decision_manual_review");
  });
});
