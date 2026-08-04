import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveReceiptValidity } from "./validityResolver";
import { buildCanonicalPayload } from "./canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "./signing";
import { subjectPseudonymId } from "./pseudonym";
import type { DecisionReceiptRecord } from "./types";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";

const TEST_KEY = generateTestSigningKeyPair();

function samplePayload(
  overrides: Partial<ReturnType<typeof buildCanonicalPayload>> = {},
) {
  return buildCanonicalPayload({
    receipt_id: "dr_validity_test",
    decision_id: "00000000-0000-4000-8000-000000000001",
    policy_id: "good-trouble-retail-v1",
    policy_version: 1,
    partner_id: "good-trouble-cannabis",
    subject_pseudonym_id: subjectPseudonymId("0xfixture"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [{
      claim_id: "claim-fixture",
      claim_type: "identity_verified",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-07-30T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "production",
    evaluated_at: "2026-07-30T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = samplePayload();
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: payload.consent_receipt_id,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: payload.wallet_binding_ref,
    decision_result: payload.decision_result,
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
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

describe("resolveReceiptValidity — negative cases", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("rejects tampered signature", async () => {
    const record = sampleRecord({ signature: "invalid" });
    const result = await resolveReceiptValidity(record);
    expect(result.validity).toBe("signature_invalid");
    expect(result.currently_valid).toBe(false);
    expect(result.signature_valid).toBe(false);
  });

  it("rejects expired receipts", async () => {
    const payload = samplePayload({
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const record = sampleRecord({
      expires_at: payload.expires_at,
      payload_hash: payloadHash,
      signature,
    });
    const result = await resolveReceiptValidity(record);
    expect(result.validity).toBe("expired");
    expect(result.currently_valid).toBe(false);
    expect(result.signature_valid).toBe(true);
  });

  it("marks sandbox policy receipts not production-usable", async () => {
    const payload = samplePayload({
      policy_id: SANDBOX_POLICY_ID,
      decision_context: "sandbox_only",
    });
    const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const record = sampleRecord({
      policy_id: payload.policy_id,
      decision_context: payload.decision_context,
      payload_hash: payloadHash,
      signature,
    });
    const result = await resolveReceiptValidity(record);
    expect(result.validity).toBe("sandbox_only");
    expect(result.currently_valid).toBe(false);
    expect(result.signature_valid).toBe(true);
  });

  it("rejects revoked receipt status", async () => {
    const record = sampleRecord({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    });
    const result = await resolveReceiptValidity(record);
    expect(result.validity).toBe("invalidated");
    expect(result.currently_valid).toBe(false);
    expect(result.signature_valid).toBe(true);
  });
});
