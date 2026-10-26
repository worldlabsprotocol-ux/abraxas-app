// FILE: lib/decisionReceipts/v1_1_0/operationalVerification.adversarial.test.ts

import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import {
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { assertV11OperationalIntegrity } from "@/lib/decisionReceipts/v1_1_0/operationalIntegrity.server";
import { verifyRecordSignatureWithRegistry as verifyClientStub } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";
import { verifyRecordSignatureWithRegistry as verifyOperational } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve.server";
import { evaluateDecisionReceiptTrustSync as evaluateTrustClient } from "@/lib/decisionReceipts/trustEvaluation";
import { evaluateDecisionReceiptTrustSync as evaluateTrustOperational } from "@/lib/decisionReceipts/trustEvaluation.server";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver.server";
import {
  attachV11FieldsFromSidecar,
  buildSignedCanonicalV11,
} from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance.server";
import {
  encodeReceiptV11Sidecar,
  V1_1_SIDECAR_SCHEMA,
} from "@/lib/decisionReceipts/v1_1_0/sidecar";
import {
  buildEvidenceCommitment,
  blindEvidenceRef,
} from "@/lib/decisionReceipts/schema/v1_1_0.server";
import { isReceiptIssuanceAuthorizable } from "@/lib/decisionReceipts/issuanceFinalization";

const BLINDING_KEY = "test-blinding-key-845";

function testKeyPair(label: string) {
  const kp = nacl.sign.keyPair();
  const privateKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: Buffer.from(kp.publicKey).toString("base64url"),
    d: Buffer.from(kp.secretKey.slice(0, 32)).toString("base64url"),
  };
  const publicKeyJwk: JsonWebKey = { kty: "OKP", crv: "Ed25519", x: privateKeyJwk.x! };
  return { label, privateKeyJwk, publicKeyJwk, signingKeyId: label };
}

function registryEnv(key: ReturnType<typeof testKeyPair>) {
  process.env.ABRAXAS_SIGNING_KEY_ID = key.signingKeyId;
  process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(key.privateKeyJwk);
  process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(key.publicKeyJwk);
  process.env.ABRAXAS_RECEIPT_KEY_ENVIRONMENT = "demo";
  process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = JSON.stringify([{
    key_id: key.signingKeyId,
    algorithm: "Ed25519",
    environment: "demo",
    status: "active",
    issued_at: "2020-01-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    public_jwk: { kty: "OKP", crv: "Ed25519", x: key.publicKeyJwk.x },
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION, "1.1.0"],
    allow_historical_verification: false,
    historical_verify_until: null,
    issuer_label: "Test",
    reason_class: "rotation",
  }]);
}

describe("Build #845 operational v1.1.0 verification", () => {
  it("v1.0.0 receipt verifies on client-safe and operational paths", () => {
    Object.assign(process.env, build546TrustRegistryEnv());
    const v10 = build546SampleRecord();
    expect(verifyClientStub(v10)).toBe(true);
    expect(verifyOperational(v10)).toBe(true);
  });

  it("v1.1.0 client-safe stub rejects signature; operational path verifies valid receipt", () => {
    const key = testKeyPair("845-v11");
    registryEnv(key);
    const commitment = buildEvidenceCommitment([]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: [],
    });
    const record = attachV11FieldsFromSidecar({
      id: "dr_v11",
      verification_decision_id: "00000000-0000-4000-8000-000000008845",
      consent_receipt_id: null,
      partner_id: "partner",
      policy_id: "policy",
      policy_version: 1,
      subject_pseudonym_id: "subj",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2027-06-01T12:00:00.000Z",
      revoked_at: null,
      status: "active",
      schema_version: "1.1.0",
      payload_hash: "pending",
      signature: "pending",
      signing_key_id: key.signingKeyId,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: "2026-06-01T12:00:00.000Z",
      issuance_finalized_at: "2026-06-01T12:00:01.000Z",
    });
    const { payload, payloadHash } = buildSignedCanonicalV11(record);
    const signed = signReceiptPayload(payload as Parameters<typeof signReceiptPayload>[0], key.privateKeyJwk);
    expect(signed.payloadHash).toBe(payloadHash);
    const stored: DecisionReceiptRecord = {
      id: record.id,
      verification_decision_id: record.verification_decision_id,
      consent_receipt_id: record.consent_receipt_id,
      partner_id: record.partner_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      subject_pseudonym_id: record.subject_pseudonym_id,
      wallet_binding_ref: record.wallet_binding_ref,
      decision_result: record.decision_result,
      reason_codes: record.reason_codes,
      evaluated_claim_refs: record.evaluated_claim_refs,
      issuer_refs: record.issuer_refs,
      decision_context: record.decision_context,
      evaluated_at: record.evaluated_at,
      expires_at: record.expires_at,
      revoked_at: record.revoked_at,
      status: record.status,
      schema_version: record.schema_version,
      payload_hash: signed.payloadHash,
      signature: signed.signature,
      signing_key_id: key.signingKeyId,
      anchor_reference: anchor,
      idempotency_key: record.idempotency_key,
      created_at: record.created_at,
      issuance_finalized_at: record.issuance_finalized_at,
    };
    expect(verifyClientStub(stored)).toBe(false);
    expect(verifyOperational(stored)).toBe(true);
    expect(evaluateTrustClient(stored).signature_valid).toBe(false);
    expect(evaluateTrustOperational(stored).signature_valid).toBe(true);
  });

  it("rejects modified payload hash on operational path", async () => {
    const key = testKeyPair("845-tamper");
    registryEnv(key);
    const commitment = buildEvidenceCommitment([]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: [],
    });
    let record = attachV11FieldsFromSidecar({
      id: "dr_tamper",
      verification_decision_id: "00000000-0000-4000-8000-000000008846",
      consent_receipt_id: null,
      partner_id: "partner",
      policy_id: "policy",
      policy_version: 1,
      subject_pseudonym_id: "subj",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2027-06-01T12:00:00.000Z",
      revoked_at: null,
      status: "active",
      schema_version: "1.1.0",
      payload_hash: "x",
      signature: "y",
      signing_key_id: key.signingKeyId,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: "2026-06-01T12:00:00.000Z",
    });
    const { payload, payloadHash } = buildSignedCanonicalV11(record);
    const signed = signReceiptPayload(payload as Parameters<typeof signReceiptPayload>[0], key.privateKeyJwk);
    record = { ...record, payload_hash: signed.payloadHash, signature: signed.signature };
    const tampered = { ...record, payload_hash: "deadbeef" };
    expect(verifyOperational(tampered)).toBe(false);
    const validity = await resolveReceiptValidity(tampered);
    expect(validity.signature_valid).toBe(false);
  });

  it("pending v1.1.0 issuance is non-authorizable and fails operational validity", async () => {
    const key = testKeyPair("845-pending");
    registryEnv(key);
    const commitment = buildEvidenceCommitment([]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "pending",
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: null,
    });
    const pending: DecisionReceiptRecord = {
      id: "dr_pending",
      verification_decision_id: "00000000-0000-4000-8000-000000008847",
      consent_receipt_id: null,
      partner_id: "partner",
      policy_id: "policy",
      policy_version: 1,
      subject_pseudonym_id: "subj",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      status: "pending_finalization",
      schema_version: "1.1.0",
      payload_hash: "h",
      signature: "s",
      signing_key_id: key.signingKeyId,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: "2026-06-01T12:00:00.000Z",
    };
    expect(isReceiptIssuanceAuthorizable(pending)).toBe(false);
    const validity = await resolveReceiptValidity(pending);
    expect(validity.currently_valid).toBe(false);
  });

  function buildSignedFinalV11(opts?: {
    application_binding_ref?: string | null;
    sidecarBinding?: string | null;
  }) {
    const key = testKeyPair("845-helper");
    registryEnv(key);
    const commitment = buildEvidenceCommitment([]);
    const sidecarBinding = opts?.sidecarBinding ?? opts?.application_binding_ref ?? null;
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: sidecarBinding,
      evidence_commitment: commitment,
      evidence_commitment_manifest: [],
    });
    const record = attachV11FieldsFromSidecar({
      id: "dr_helper",
      verification_decision_id: "00000000-0000-4000-8000-000000008849",
      consent_receipt_id: null,
      partner_id: "partner",
      policy_id: "policy",
      policy_version: 1,
      subject_pseudonym_id: "subj",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2027-06-01T12:00:00.000Z",
      revoked_at: null,
      status: "active",
      schema_version: "1.1.0",
      payload_hash: "pending",
      signature: "pending",
      signing_key_id: key.signingKeyId,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: "2026-06-01T12:00:00.000Z",
      issuance_finalized_at: "2026-06-01T12:00:01.000Z",
      application_binding_ref: opts?.application_binding_ref,
    });
    const { payload, payloadHash } = buildSignedCanonicalV11(record);
    const signed = signReceiptPayload(payload as Parameters<typeof signReceiptPayload>[0], key.privateKeyJwk);
    const stored: DecisionReceiptRecord = {
      ...record,
      payload_hash: signed.payloadHash,
      signature: signed.signature,
      signing_key_id: key.signingKeyId,
      anchor_reference: anchor,
    };
    return { stored, commitment, anchor, key, sidecarBinding: sidecarBinding ?? null };
  }

  it("pre-152 sidecar-only row passes operational integrity", () => {
    const { stored, commitment, anchor } = buildSignedFinalV11();
    const row = {
      id: stored.id,
      verification_decision_id: stored.verification_decision_id,
      consent_receipt_id: stored.consent_receipt_id,
      partner_id: stored.partner_id,
      policy_id: stored.policy_id,
      policy_version: stored.policy_version,
      subject_pseudonym_id: stored.subject_pseudonym_id,
      wallet_binding_ref: stored.wallet_binding_ref,
      decision_result: stored.decision_result,
      reason_codes: stored.reason_codes,
      evaluated_claim_refs: stored.evaluated_claim_refs,
      issuer_refs: stored.issuer_refs,
      decision_context: stored.decision_context,
      evaluated_at: stored.evaluated_at,
      expires_at: stored.expires_at,
      revoked_at: stored.revoked_at,
      status: stored.status,
      schema_version: stored.schema_version,
      payload_hash: stored.payload_hash,
      signature: stored.signature,
      signing_key_id: stored.signing_key_id,
      anchor_reference: anchor,
      idempotency_key: stored.idempotency_key,
      created_at: stored.created_at,
    };
    const mapped = mapReceiptRow(row);
    expect(mapped.v11_dedicated_persistence?.columns.application_binding_ref).toBe(false);
    expect(assertV11OperationalIntegrity(mapped).ok).toBe(true);
    expect(verifyOperational(mapped)).toBe(true);
  });

  it("post-152 unbackfilled null columns accept signed sidecar values", () => {
    const { stored, anchor, commitment } = buildSignedFinalV11({ sidecarBinding: "bind-signed" });
    const row = {
      id: stored.id,
      verification_decision_id: stored.verification_decision_id,
      consent_receipt_id: null,
      partner_id: stored.partner_id,
      policy_id: stored.policy_id,
      policy_version: stored.policy_version,
      subject_pseudonym_id: stored.subject_pseudonym_id,
      wallet_binding_ref: null,
      decision_result: stored.decision_result,
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: stored.decision_context,
      evaluated_at: stored.evaluated_at,
      expires_at: stored.expires_at,
      revoked_at: null,
      status: stored.status,
      schema_version: "1.1.0",
      payload_hash: stored.payload_hash,
      signature: stored.signature,
      signing_key_id: stored.signing_key_id,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: stored.created_at,
      application_binding_ref: null,
      evidence_commitment: null,
      v11_issuance_phase: null,
    };
    const mapped = mapReceiptRow(row);
    expect(mapped.application_binding_ref).toBe(null);
    expect(mapped.v11_dedicated_persistence?.issuance_phase).toBe(null);
    expect(assertV11OperationalIntegrity(mapped).ok).toBe(true);
    expect(verifyOperational(mapped)).toBe(true);
  });

  it("final phase rejects dedicated null application_binding vs signed sidecar binding", () => {
    const commitment = buildEvidenceCommitment([]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: "bind-signed",
      evidence_commitment: commitment,
      evidence_commitment_manifest: [],
    });
    const { stored } = buildSignedFinalV11({ sidecarBinding: "bind-signed" });
    const mapped = mapReceiptRow({
      id: stored.id,
      verification_decision_id: stored.verification_decision_id,
      consent_receipt_id: null,
      partner_id: stored.partner_id,
      policy_id: stored.policy_id,
      policy_version: stored.policy_version,
      subject_pseudonym_id: stored.subject_pseudonym_id,
      wallet_binding_ref: null,
      decision_result: stored.decision_result,
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: stored.decision_context,
      evaluated_at: stored.evaluated_at,
      expires_at: stored.expires_at,
      revoked_at: null,
      status: stored.status,
      schema_version: "1.1.0",
      payload_hash: stored.payload_hash,
      signature: stored.signature,
      signing_key_id: stored.signing_key_id,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: stored.created_at,
      application_binding_ref: null,
      evidence_commitment: commitment,
      v11_issuance_phase: "final",
    });
    const integrity = assertV11OperationalIntegrity(mapped);
    expect(integrity.ok).toBe(false);
    if (!integrity.ok) {
      expect(integrity.reasons).toContain("application_binding_persistence_mismatch");
    }
  });

  it("final phase rejects dedicated null evidence_commitment vs signed sidecar commitment", () => {
    const commitment = buildEvidenceCommitment([]);
    const sidecarCommitment = buildEvidenceCommitment([{
      dependency_type: "reusable_fact",
      fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
      source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
    }]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: null,
      evidence_commitment: sidecarCommitment,
      evidence_commitment_manifest: [{
        dependency_type: "reusable_fact",
        fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
        source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
      }],
    });
    const { stored } = buildSignedFinalV11();
    const mapped = mapReceiptRow({
      id: stored.id,
      verification_decision_id: stored.verification_decision_id,
      consent_receipt_id: null,
      partner_id: stored.partner_id,
      policy_id: stored.policy_id,
      policy_version: stored.policy_version,
      subject_pseudonym_id: stored.subject_pseudonym_id,
      wallet_binding_ref: null,
      decision_result: stored.decision_result,
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: stored.decision_context,
      evaluated_at: stored.evaluated_at,
      expires_at: stored.expires_at,
      revoked_at: null,
      status: stored.status,
      schema_version: "1.1.0",
      payload_hash: stored.payload_hash,
      signature: stored.signature,
      signing_key_id: stored.signing_key_id,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: stored.created_at,
      application_binding_ref: null,
      evidence_commitment: null,
      v11_issuance_phase: "final",
    });
    const integrity = assertV11OperationalIntegrity(mapped);
    expect(integrity.ok).toBe(false);
    if (!integrity.ok) {
      expect(integrity.reasons).toContain("evidence_commitment_persistence_mismatch");
    }
  });

  it("rejects evidence_commitment_manifest tampering when dedicated column is authoritative", () => {
    const manifest = [{
      dependency_type: "reusable_fact" as const,
      fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
      source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
    }];
    const commitment = buildEvidenceCommitment(manifest);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: manifest,
    });
    const { stored } = buildSignedFinalV11();
    const tamperedManifest = [{
      ...manifest[0],
      fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000evil", BLINDING_KEY),
    }];
    const mapped = mapReceiptRow({
      id: stored.id,
      verification_decision_id: stored.verification_decision_id,
      consent_receipt_id: null,
      partner_id: stored.partner_id,
      policy_id: stored.policy_id,
      policy_version: stored.policy_version,
      subject_pseudonym_id: stored.subject_pseudonym_id,
      wallet_binding_ref: null,
      decision_result: stored.decision_result,
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: stored.decision_context,
      evaluated_at: stored.evaluated_at,
      expires_at: stored.expires_at,
      revoked_at: null,
      status: stored.status,
      schema_version: "1.1.0",
      payload_hash: stored.payload_hash,
      signature: stored.signature,
      signing_key_id: stored.signing_key_id,
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: stored.created_at,
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: tamperedManifest,
      v11_issuance_phase: "final",
    });
    const integrity = assertV11OperationalIntegrity(mapped);
    expect(integrity.ok).toBe(false);
    if (!integrity.ok) {
      expect(integrity.reasons).toContain("evidence_commitment_manifest_persistence_mismatch");
    }
  });

  it("mapReceiptRow detects dedicated column vs sidecar mismatch", async () => {
    const commitment = buildEvidenceCommitment([{
      dependency_type: "reusable_fact",
      fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
      source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
    }]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: "bind-a",
      evidence_commitment: commitment,
      evidence_commitment_manifest: [{
        dependency_type: "reusable_fact",
        fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
        source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
      }],
    });
    const row = {
      id: "dr_row",
      verification_decision_id: "00000000-0000-4000-8000-000000008848",
      consent_receipt_id: null,
      partner_id: "p",
      policy_id: "pol",
      policy_version: 1,
      subject_pseudonym_id: "sub",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      status: "active",
      schema_version: "1.1.0",
      payload_hash: "h",
      signature: "s",
      signing_key_id: "k",
      anchor_reference: anchor,
      idempotency_key: null,
      created_at: "2026-06-01T12:00:00.000Z",
      application_binding_ref: "bind-b",
      evidence_commitment: commitment,
    };
    const mapped = mapReceiptRow(row);
    expect(mapped.application_binding_ref).toBe("bind-b");
    const integrity = assertV11OperationalIntegrity(mapped);
    expect(integrity.ok).toBe(false);
    if (!integrity.ok) {
      expect(integrity.reasons).toContain("application_binding_persistence_mismatch");
    }
  });
});
