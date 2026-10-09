// FILE: lib/goodTrouble/sandboxReceiptTrust.integration.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@/lib/partner/sandboxReceiptTrustContract";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { validatePartnerFlowPublicReceipt } from "@abraxas/partner-kit/trust";
import { verifyGoodTroubleSandboxAccess } from "@/lib/goodTrouble/sandboxPartnerVerification";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { SELF_ATTESTATION_CLAIM_TYPE, SELF_ATTESTATION_ISSUER } from "@/lib/assurance/selfAttestation/constants";

const getSelfAttestationByIdMock = vi.fn();

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  getReceiptDependencies: vi.fn(async () => []),
}));

vi.mock("@/lib/decisionReceipts/evidenceDependencies", () => ({
  getReceiptEvidenceDependencies: vi.fn(async () => []),
}));

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: vi.fn(async () => ({ issuer_status: "active" })),
  getIssuerSigningKey: vi.fn(async () => ({ status: "active" })),
  isIssuerTrustedForClaim: vi.fn(async () => ({ ok: true, reason: "" })),
}));

vi.mock("@/lib/assurance/selfAttestation/selfAttestationLedger", () => ({
  getSelfAttestationById: (...args: unknown[]) => getSelfAttestationByIdMock(...args),
}));

const KEY = generateTestSigningKeyPair();

function sandboxGoodTroubleRecord(
  overrides: Partial<DecisionReceiptRecord> = {},
): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_gt_sandbox_trust",
    decision_id: "00000000-0000-4000-8000-000000000099",
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 2,
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId("0xfixture"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [{
      claim_id: "self-attest:ledger-active",
      claim_type: SELF_ATTESTATION_CLAIM_TYPE,
      issuer_id: SELF_ATTESTATION_ISSUER,
      status: "active",
      issued_at: "2026-10-09T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
    }],
    issuer_refs: [SELF_ATTESTATION_ISSUER],
    decision_context: "sandbox_only",
    evaluated_at: "2026-10-09T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, KEY.privateKeyJwk);
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
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: "sandbox_only",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: payload.decision_id,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

function publicViewFromRecord(record: DecisionReceiptRecord) {
  return {
    receipt_id: record.id,
    schema_version: record.schema_version,
    artifact_type: "eligibility_decision_receipt",
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    decision_result: record.decision_result,
    signature_valid: true,
    expires_at: record.expires_at,
    status: record.status,
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    evaluated_claim_refs: record.evaluated_claim_refs,
    lifecycle_status: "active",
  };
}

describe("Good Trouble sandbox receipt trust", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(KEY.publicKeyJwk);
    getSelfAttestationByIdMock.mockResolvedValue({
      id: "ledger-active",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      revoked_at: null,
    });
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
    vi.clearAllMocks();
  });

  it("1. fresh sandbox v2 receipt passes async trust with L0 self-attestation", async () => {
    const record = sandboxGoodTroubleRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.currently_valid).toBe(true);
    expect(trust.production_usable).toBe(false);
    expect(trust.invalidation_reasons).toContain(CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON);
  });

  it("2. partner-kit sandbox validation accepts the public projection", () => {
    const record = sandboxGoodTroubleRecord();
    const validation = validatePartnerFlowPublicReceipt(publicViewFromRecord(record), {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      mode: "sandbox",
    });
    expect(validation.ok).toBe(true);
  });

  it("3. canonical Good Trouble verifier permits with mocked public fetch", async () => {
    const record = sandboxGoodTroubleRecord();
    const view = publicViewFromRecord(record);
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(view), { status: 200 })) as unknown as typeof fetch;
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: record.id }),
      fetchFn,
    });
    expect(result.grant).toBe(true);
    expect(result.action).toBe("permit");
  });

  it("4. production-context receipt cannot pass sandbox verifier", async () => {
    const record = sandboxGoodTroubleRecord();
    const view = {
      ...publicViewFromRecord(record),
      decision_context: "production",
      production_usable: true,
      invalidation_reasons: [],
      currently_valid: true,
    };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(view), { status: 200 })) as unknown as typeof fetch;
    const result = await verifyGoodTroubleSandboxAccess({
      search: new URLSearchParams({ receipt_id: record.id }),
      fetchFn,
    });
    expect(result.grant).toBe(false);
    expect(result.action).toBe("deny");
  });

  it("5. missing self-attestation evidence fails closed", async () => {
    getSelfAttestationByIdMock.mockResolvedValue(null);
    const record = sandboxGoodTroubleRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.currently_valid).toBe(false);
    expect(trust.invalidation_reasons.some((r) => r.includes("missing_claim"))).toBe(true);
  });

  it("6. revoked self-attestation ledger row fails closed", async () => {
    getSelfAttestationByIdMock.mockResolvedValue({
      id: "ledger-active",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      revoked_at: new Date().toISOString(),
    });
    const record = sandboxGoodTroubleRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.currently_valid).toBe(false);
    expect(trust.invalidation_reasons.some((r) => r.includes("claim_revoked"))).toBe(true);
  });

  it("7. wrong partner binding denies trust evaluation", async () => {
    const record = sandboxGoodTroubleRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: "other-partner",
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.currently_valid).toBe(false);
    expect(trust.validity).toBe("partner_mismatch");
  });

});
