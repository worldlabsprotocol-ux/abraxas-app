// FILE: lib/decisionReceipts/receiptIntegrityDiagnostics.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  evaluateReceiptIntegrity,
  integrityResponseHasNoSecrets,
} from "@/lib/decisionReceipts/receiptIntegrityDiagnostics";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";

const TEST_KEY = generateTestSigningKeyPair();

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_integrity_demo01",
    decision_id: "00000000-0000-4000-8000-000000000099",
    policy_id: SANDBOX_POLICY_ID,
    policy_version: 1,
    partner_id: "abraxas-partner-sandbox",
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-08-20T12:00:00.000Z",
    expires_at: "2026-08-21T12:00:00.000Z",
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
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

describe("receiptIntegrityDiagnostics", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("reports aligned stored hash and valid signature", () => {
    const record = sampleRecord();
    const report = evaluateReceiptIntegrity(record);
    expect(report).toEqual({
      payload_hash_matches_recomputed: true,
      signature_valid: true,
    });
    expect(integrityResponseHasNoSecrets(report)).toBe(true);
  });

  it("detects Z versus +00:00 timestamp drift without normalizing", () => {
    const record = sampleRecord({
      evaluated_at: "2026-08-20T12:00:00.000+00:00",
    });
    const report = evaluateReceiptIntegrity(record);
    expect(report.payload_hash_matches_recomputed).toBe(false);
    expect(report.signature_valid).toBe(false);
  });

  it("detects expires_at drift with the same pattern", () => {
    const record = sampleRecord({
      expires_at: "2026-08-21T12:00:00.000+00:00",
    });
    const report = evaluateReceiptIntegrity(record);
    expect(report.payload_hash_matches_recomputed).toBe(false);
    expect(report.signature_valid).toBe(false);
  });

  it("does not expose secret material in integrity report fields", () => {
    const record = sampleRecord();
    const report = evaluateReceiptIntegrity(record);
    const serialized = JSON.stringify(report);

    expect(integrityResponseHasNoSecrets(report)).toBe(true);
    expect(serialized).not.toContain(record.signature);
    expect(serialized).not.toContain(record.payload_hash);
    expect(serialized).not.toMatch(/[0-9a-f]{64}/i);
    expect(Object.keys(report).sort()).toEqual([
      "payload_hash_matches_recomputed",
      "signature_valid",
    ]);
  });

  it("rejects extra fields in integrity response guard", () => {
    expect(integrityResponseHasNoSecrets({
      payload_hash_matches_recomputed: true,
      signature_valid: false,
      payload_hash: "deadbeef",
    })).toBe(false);
  });
});
