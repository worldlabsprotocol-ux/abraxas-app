// FILE: lib/decisionReceipts/decisionReceipts.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { canonicalizeJson, buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import {
  assertNoPiiInPublicView,
  isReceiptCurrentlyValid,
  resolveReceiptStatus,
  toPublicView,
  toPartnerView,
  verifyRecordSignature,
} from "@/lib/decisionReceipts/views";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";

const TEST_KEY = generateTestSigningKeyPair();

function samplePayload(overrides: Partial<ReturnType<typeof buildCanonicalPayload>> = {}) {
  return buildCanonicalPayload({
    receipt_id: "dr_test123",
    decision_id: "00000000-0000-4000-8000-000000000001",
    policy_id: "abraxas-booking-v1",
    policy_version: 1,
    partner_id: "abraxas",
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    wallet_binding_ref: "wb-1",
    consent_receipt_id: "00000000-0000-4000-8000-000000000002",
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [{
      claim_id: "claim-1",
      claim_type: "identity_verified",
      issuer_id: "issuer:veriff",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer:veriff"],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2026-07-01T12:00:00.000Z",
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

describe("decision receipt canonicalization", () => {
  it("produces identical hash regardless of key order", () => {
    const a = canonicalizeJson({ z: 1, a: { y: 2, b: 3 } });
    const b = canonicalizeJson({ a: { b: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });

  it("sorts reason codes and claim refs deterministically", () => {
    const p1 = samplePayload({
      reason_codes: ["z_code", "a_code"],
      evaluated_claim_refs: [
        { claim_id: "b", claim_type: "x", issuer_id: "i", status: "active", issued_at: "2026-01-01T00:00:00.000Z", expires_at: null },
        { claim_id: "a", claim_type: "y", issuer_id: "i", status: "active", issued_at: "2026-01-01T00:00:00.000Z", expires_at: null },
      ],
    });
    const p2 = samplePayload({
      reason_codes: ["a_code", "z_code"],
      evaluated_claim_refs: [
        { claim_id: "a", claim_type: "y", issuer_id: "i", status: "active", issued_at: "2026-01-01T00:00:00.000Z", expires_at: null },
        { claim_id: "b", claim_type: "x", issuer_id: "i", status: "active", issued_at: "2026-01-01T00:00:00.000Z", expires_at: null },
      ],
    });
    expect(hashCanonicalPayload(p1)).toBe(hashCanonicalPayload(p2));
  });
});

describe("decision receipt signing", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("signs and verifies payload integrity", () => {
    const payload = samplePayload();
    const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    expect(payloadHash).toHaveLength(64);
    expect(verifyReceiptSignature(payload, signature, TEST_KEY.publicKeyJwk)).toBe(true);
  });

  it("rejects tampered payloads", () => {
    const payload = samplePayload();
    const { signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const tampered = { ...payload, decision_result: "denied" as const };
    expect(verifyReceiptSignature(tampered, signature, TEST_KEY.publicKeyJwk)).toBe(false);
  });
});

describe("decision receipt validity", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("marks expired receipts as expired", () => {
    const record = sampleRecord({
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    expect(resolveReceiptStatus(record)).toBe("expired");
    expect(isReceiptCurrentlyValid(record)).toBe(false);
  });

  it("marks revoked receipts as invalid", () => {
    const record = sampleRecord({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    });
    expect(resolveReceiptStatus(record)).toBe("revoked");
    expect(isReceiptCurrentlyValid(record)).toBe(false);
  });

  it("rejects sandbox policy receipts for production use", () => {
    const record = sampleRecord({
      policy_id: SANDBOX_POLICY_ID,
      decision_context: "sandbox_only",
    });
    expect(isReceiptCurrentlyValid(record)).toBe(false);
    const view = toPublicView(record);
    expect(view.production_usable).toBe(false);
    expect(view.decision_context).toBe("sandbox_only");
  });
});

describe("decision receipt public output", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("exposes no PII fields in public view", () => {
    const record = sampleRecord();
    const view = toPublicView(record);
    assertNoPiiInPublicView(view);
    expect(view.artifact_type).toBe("eligibility_decision_receipt");
    expect(JSON.stringify(view)).not.toContain("0xabc");
    expect(JSON.stringify(view)).not.toContain("claim_value");
  });

  it("verifies signature status on public view", () => {
    const record = sampleRecord();
    const view = toPublicView(record);
    expect(view.signature_valid).toBe(true);
    expect(verifyRecordSignature(record)).toBe(true);
  });

  it("withholds wallet binding when consent scope disallowed", () => {
    const record = sampleRecord();
    const partnerView = toPartnerView(record, false);
    expect(partnerView.consent_scope_allowed).toBe(false);
    expect(partnerView.wallet_binding_ref).toBeNull();
  });

  it("includes wallet binding ref when consent scope allowed", () => {
    const record = sampleRecord();
    const partnerView = toPartnerView(record, true);
    expect(partnerView.consent_scope_allowed).toBe(true);
    expect(partnerView.wallet_binding_ref).toBe("wb-1");
  });
});

describe("subject pseudonym", () => {
  it("is deterministic and not the raw address", () => {
    const p = subjectPseudonymId("0xdeadbeef");
    expect(p).not.toContain("0xdeadbeef");
    expect(subjectPseudonymId("0xdeadbeef")).toBe(p);
  });
});

describe("consent mismatch behavior", () => {
  it("partner view reflects consent_scope_allowed false", () => {
    const record = sampleRecord({ consent_receipt_id: "wrong-consent" });
    const view = toPartnerView(record, false);
    expect(view.consent_scope_allowed).toBe(false);
  });
});

describe("idempotency key shape", () => {
  it("uses decision id as stable idempotency reference", () => {
    const record = sampleRecord();
    expect(record.idempotency_key).toBe(record.verification_decision_id);
  });
});
