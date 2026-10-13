// FILE: lib/institutionalCertification/build546/adversarialCertification.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  BUILD_546_RETIRED_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "./fixtures";
import { verifyReceiptIndependently, build546ReferenceChainPackage } from "./independentVerifier";
import { ExternalRelyingPartyHarness } from "./externalRelyingParty";
import { CONFORMANCE_VECTOR_PACKAGE } from "@/lib/partner/onchainVerifierConformance/vectors";

describe("Build #546 adversarial institutional certification", () => {
  let env: Record<string, string>;

  beforeEach(() => {
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  function runValidWithRevocation() {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    return verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: pub,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
  }

  it("valid receipt — authorize with live revocation feed", () => {
    const result = runValidWithRevocation();
    expect(result.verdict).toBe("authorize");
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.currently_authorizable).toBe(true);
  });

  it("modified receipt payload — reject tamper", () => {
    const record = build546SampleRecord();
    const tampered = { ...record, decision_result: "denied" as const };
    const result = verifyReceiptIndependently({
      signedRecord: tampered,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
    expect(result.failure_codes).toContain("payload_tampered");
  });

  it("forged issuer — unknown signing key", () => {
    const record = build546SampleRecord(BUILD_546_UNKNOWN_KEY);
    const result = verifyReceiptIndependently({
      signedRecord: record,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
    expect(result.failure_codes.some((c) => c.includes("unknown_key"))).toBe(true);
  });

  it("retired signing key outside historical window — reject", () => {
    const record = build546SampleRecord(BUILD_546_RETIRED_KEY);
    const result = verifyReceiptIndependently({
      signedRecord: record,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
    expect(
      result.failure_codes.some((c) => c.includes("historical_not_allowed") || c.includes("expired") || c.includes("unknown_key")),
    ).toBe(true);
  });

  it("expired receipt — reject", () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, {
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    const pub = build546PublicPartnerView(record);
    pub.expires_at = record.expires_at;
    pub.currently_valid = false;
    pub.lifecycle_status = "expired";
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: pub,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
    expect(result.currently_authorizable).toBe(false);
  });

  it("future-dated evaluated_at with valid signature — reject policy temporal gate", () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, {
      evaluated_at: "2099-01-01T00:00:00.000Z",
    });
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: build546PublicPartnerView(record),
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.currently_authorizable).toBe(false);
    expect(result.verdict).toBe("reject");
  });

  it("revoked receipt — reject", () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, { status: "revoked", revoked_at: BUILD_546_FIXTURE_NOW.toISOString() });
    const pub = build546PublicPartnerView(record);
    pub.status = "revoked";
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: pub,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "revoked" },
    });
    expect(result.verdict).toBe("reject");
    expect(result.failure_codes).toContain("receipt_revoked");
  });

  it("stale validity — blocked without revocation feed", () => {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: pub,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.verdict).toBe("blocked");
    expect(result.currently_authorizable).toBe(false);
    expect(result.failure_codes).toContain("revocation_not_checked");
  });

  it("incorrect policy — reject", () => {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: pub,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: "wrong-policy-v1" },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
    expect(result.failure_codes.some((c) => c.includes("policy_mismatch"))).toBe(true);
  });

  it("incorrect audience / cross-application misuse — reject", () => {
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: pub,
      expectations: {
        partnerId: BUILD_546_PARTNER_ID,
        policyId: BUILD_546_POLICY_ID,
        audiencePartnerId: "other-merchant-app",
      },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
    expect(result.failure_codes).toContain("audience_mismatch");
  });

  it("replay of consumed single-use receipt — external RP denies", () => {
    const rp = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const first = rp.decide({
      requestId: "req-1",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(first.outcome).toBe("granted");
    const second = rp.decide({
      requestId: "req-2",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(second.replay_detected).toBe(true);
    expect(second.outcome).toBe("denied");
  });

  it("duplicate request id still enforces single-use consumption", () => {
    const rp = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    rp.decide({
      requestId: "dup",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    const dup = rp.decide({
      requestId: "dup",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(dup.replay_detected).toBe(true);
  });

  it("unavailable revocation source — blocked fail-closed", () => {
    const record = build546SampleRecord();
    const result = verifyReceiptIndependently({
      signedRecord: record,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: false, reason: "unavailable" },
    });
    expect(result.verdict).toBe("blocked");
  });

  it("chain RPC failure — blocked", () => {
    const result = verifyReceiptIndependently({
      signedRecord: build546SampleRecord(),
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
      chainPackage: build546ReferenceChainPackage(),
      chainRpcAvailable: false,
    });
    expect(result.failure_codes).toContain("chain_rpc_failure");
  });

  it("chain mismatch — reject malformed package", () => {
    const result = verifyReceiptIndependently({
      signedRecord: build546SampleRecord(),
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
      chainPackage: { unexpected: true },
      chainRpcAvailable: true,
    });
    expect(result.phases.find((p) => p.id === "chain_evidence")?.status).toBe("fail");
  });

  it("malformed proof — reject bad signature bytes", () => {
    const record = build546SampleRecord();
    record.signature = "not-a-valid-base64url-signature";
    const result = verifyReceiptIndependently({
      signedRecord: record,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
  });

  it("unauthorized policy escalation — reject elevated policy id", () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, { policy_id: "privileged-admin-policy" });
    const payload = buildCanonicalPayload({
      receipt_id: record.id,
      decision_id: record.verification_decision_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      partner_id: record.partner_id,
      subject_pseudonym_id: record.subject_pseudonym_id,
      wallet_binding_ref: record.wallet_binding_ref,
      consent_receipt_id: record.consent_receipt_id,
      decision_result: record.decision_result,
      reason_codes: record.reason_codes,
      evaluated_claim_refs: record.evaluated_claim_refs,
      issuer_refs: record.issuer_refs,
      decision_context: record.decision_context,
      evaluated_at: record.evaluated_at,
      expires_at: record.expires_at,
    });
    const { payloadHash, signature } = signReceiptPayload(payload, BUILD_546_PRIMARY_KEY.privateKeyJwk);
    record.payload_hash = payloadHash;
    record.signature = signature;
    const result = verifyReceiptIndependently({
      signedRecord: record,
      publicReceipt: build546PublicPartnerView(record),
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(result.verdict).toBe("reject");
  });

  it("reference chain vector package — offline conformance pass", () => {
    const result = verifyReceiptIndependently({
      signedRecord: build546SampleRecord(),
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
      chainPackage: CONFORMANCE_VECTOR_PACKAGE,
      chainRpcAvailable: true,
    });
    expect(result.phases.find((p) => p.id === "chain_evidence")?.status).toBe("pass");
  });
});
