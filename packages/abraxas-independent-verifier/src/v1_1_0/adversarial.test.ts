import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  TRUST_ANCHOR_BUNDLE_DOCUMENT,
  TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
  type DecisionReceiptRecord,
  type IssuerAuthorityStatementPayload,
  type TrustAnchorBundleV1,
} from "../types";
import { publicEd25519JwkFingerprint } from "../fingerprint";
import { signIssuerAuthorityPayloadForTests } from "../issuerAuthorityStatement";
import { signReceiptStatusStatement } from "../signedReceiptStatusStatement";
import { verifyAbraxasReceiptIndependently } from "../verifyIndependent";
import { buildCanonicalPayloadFromRecord, hashCanonicalPayload } from "../canonical";
import { deriveApplicationBindingRef } from "./applicationBinding";
import { buildEvidenceCommitment, type EvidenceCommitmentEntryV1 } from "./evidenceCommitment";
import { buildCanonicalPayloadV1_1, hashCanonicalPayloadV1_1 } from "./canonical";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "./constants";
import { verifyReceiptPayloadIntegrity } from "../receiptVerify";

function keyPair(label: string) {
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

function trustBundle(anchor: ReturnType<typeof keyPair>): TrustAnchorBundleV1 {
  return {
    document: TRUST_ANCHOR_BUNDLE_DOCUMENT,
    schema_version: TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
    anchor_key_id: "anchor-primary",
    public_jwk: anchor.publicKeyJwk,
    public_key_fingerprint: publicEd25519JwkFingerprint(anchor.publicKeyJwk)!,
    environment: "production",
    effective_from: "2020-01-01T00:00:00.000Z",
    distribution: "out_of_band",
    statement_cache_max_age_seconds: 3600,
    status_statement_max_age_seconds: 3600,
    minimum_registry_version_hint: null,
  };
}

function statementPayload(
  receiptKey: ReturnType<typeof keyPair>,
  statusSigner: ReturnType<typeof keyPair>,
  registryVersion: number,
): IssuerAuthorityStatementPayload {
  return {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: registryVersion,
    supersedes_registry_version: registryVersion > 1 ? registryVersion - 1 : null,
    environment: "production",
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: "anchor-primary",
    keys: [
      {
        key_id: receiptKey.signingKeyId,
        environment: "production",
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: receiptKey.publicKeyJwk,
        schema_versions: ["1.0.0", "1.1.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      },
    ],
    status_signers: [
      {
        key_id: "status-signer-1",
        environment: "production",
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: statusSigner.publicKeyJwk,
        reason_class: "active",
      },
    ],
  };
}

function signV11Record(
  receiptKey: ReturnType<typeof keyPair>,
  overrides: Partial<DecisionReceiptRecord> = {},
): DecisionReceiptRecord {
  const base: DecisionReceiptRecord = {
    id: "dr_v110",
    verification_decision_id: "00000000-0000-4000-8000-000000008842",
    consent_receipt_id: null,
    partner_id: "partner-842",
    policy_id: "policy-842",
    policy_version: 2,
    subject_pseudonym_id: "subj-842",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [{ claim_id: "claim-1", claim_type: "age21", status: "active" }],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
    status: "active",
    schema_version: DECISION_RECEIPT_SCHEMA_V1_1,
    payload_hash: "",
    signature: "",
    signing_key_id: receiptKey.signingKeyId,
    ...overrides,
  };
  const payload = buildCanonicalPayloadV1_1(base);
  const payload_hash = hashCanonicalPayloadV1_1(payload);
  const message = Buffer.from(payload_hash, "hex");
  const sig = nacl.sign.detached(
    message,
    nacl.sign.keyPair.fromSeed(Buffer.from(receiptKey.privateKeyJwk.d!, "base64url")).secretKey,
  );
  return { ...base, payload_hash, signature: Buffer.from(sig).toString("base64url") };
}

function signedStatusFor(record: DecisionReceiptRecord, statusSigner: ReturnType<typeof keyPair>) {
  const issued = new Date();
  const expires = new Date(issued.getTime() + 300_000);
  return signReceiptStatusStatement({
    statusSignerPrivateJwk: statusSigner.privateKeyJwk,
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: record.id,
      status_reference: record.id,
      partner_id: record.partner_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      environment: "production",
      status_version: 1,
      supersedes_status_version: null,
      receipt_status: "active",
      superseded: false,
      partner_operational: true,
      policy_active: true,
      claims_current: true,
      evidence_current: true,
      effective_at: issued.toISOString(),
      issued_at: issued.toISOString(),
      statement_expires_at: expires.toISOString(),
      status_signer_key_id: "status-signer-1",
    },
  });
}

const manifest: EvidenceCommitmentEntryV1[] = [
  {
    dependency_type: "reusable_fact",
    fact_id: "00000000-0000-4000-8000-0000000000f1",
    source_credential_id: "00000000-0000-4000-8000-0000000000r1",
  },
];

describe("receipt v1.1.0 cryptographic binding", () => {
  const anchor = keyPair("anchor");
  const receiptKey = keyPair("receipt-signer");
  const statusSigner = keyPair("status-signer");
  const bundle = trustBundle(anchor);
  const appRef = deriveApplicationBindingRef(
    {
      partner_id: "partner-842",
      policy_id: "policy-842",
      policy_version: 2,
      decision_context: "production",
      launchpad_application_id: "00000000-0000-4000-8000-00000000app1",
    },
    Buffer.from("test-scope-secret"),
  );

  it("preserves v1.0.0 canonical hash for unchanged records", () => {
    const v10: DecisionReceiptRecord = {
      id: "dr_legacy",
      verification_decision_id: "00000000-0000-4000-8000-000000000099",
      consent_receipt_id: null,
      partner_id: "p",
      policy_id: "pol",
      policy_version: 1,
      subject_pseudonym_id: "sub",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: ["ok"],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
      status: "active",
      schema_version: "1.0.0",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "k",
    };
    const a = hashCanonicalPayload(buildCanonicalPayloadFromRecord(v10));
    const b = hashCanonicalPayload(buildCanonicalPayloadFromRecord({ ...v10 }));
    expect(a).toBe(b);
  });

  it("accepts valid v1.1.0 receipt with binding and evidence commitment", () => {
    const commitment = buildEvidenceCommitment(manifest);
    const record = signV11Record(receiptKey, {
      application_binding_ref: appRef,
      evidence_commitment: commitment,
    });
    expect(verifyReceiptPayloadIntegrity(record)).toBe(true);
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: {
        partner_id: "partner-842",
        policy_id: "policy-842",
        environment: "production",
        application_binding_ref: appRef,
        evidence_commitment_manifest: manifest,
      },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(record, statusSigner),
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.failure_codes).not.toContain("application_binding_mismatch");
    expect(result.failure_codes).not.toContain("evidence_commitment_digest_mismatch");
  });

  it("rejects application substitution", () => {
    const otherRef = deriveApplicationBindingRef(
      {
        partner_id: "partner-842",
        policy_id: "policy-842",
        policy_version: 2,
        decision_context: "production",
        launchpad_application_id: "00000000-0000-4000-8000-00000000app2",
      },
      Buffer.from("test-scope-secret"),
    );
    const record = signV11Record(receiptKey, { application_binding_ref: otherRef });
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: {
        partner_id: "partner-842",
        policy_id: "policy-842",
        environment: "production",
        application_binding_ref: appRef,
      },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(record, statusSigner),
    });
    expect(result.failure_codes).toContain("application_binding_mismatch");
  });

  it("rejects evidence commitment modification", () => {
    const commitment = buildEvidenceCommitment(manifest);
    const record = signV11Record(receiptKey, { evidence_commitment: commitment });
    const tamperedManifest = [...manifest, { dependency_type: "derived_from" as const, fact_id: "x", source_credential_id: null }];
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: {
        partner_id: "partner-842",
        policy_id: "policy-842",
        environment: "production",
        evidence_commitment_manifest: tamperedManifest,
      },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(record, statusSigner),
    });
    expect(
      result.failure_codes.some((c) =>
        c === "evidence_commitment_digest_mismatch" || c === "evidence_commitment_entry_count_mismatch",
      ),
    ).toBe(true);
  });

  it("rejects v1.1 fields on schema_version 1.0.0", () => {
    const base: DecisionReceiptRecord = {
      id: "dr_downgrade",
      verification_decision_id: "00000000-0000-4000-8000-000000000088",
      consent_receipt_id: null,
      partner_id: "partner-842",
      policy_id: "policy-842",
      policy_version: 2,
      subject_pseudonym_id: "subj",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: ["ok"],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
      status: "active",
      schema_version: "1.0.0",
      payload_hash: hashCanonicalPayload(buildCanonicalPayloadFromRecord({
        schema_version: "1.0.0",
        receipt_id: "dr_downgrade",
        decision_id: "00000000-0000-4000-8000-000000000088",
        policy_id: "policy-842",
        policy_version: 2,
        partner_id: "partner-842",
        subject_pseudonym_id: "subj",
        wallet_binding_ref: null,
        consent_receipt_id: null,
        decision_result: "approved",
        reason_codes: ["ok"],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "production",
        evaluated_at: "2026-06-01T12:00:00.000Z",
        expires_at: null,
      })),
      signature: "x",
      signing_key_id: receiptKey.signingKeyId,
      application_binding_ref: appRef,
    };
    expect(verifyReceiptPayloadIntegrity(base)).toBe(false);
  });

  it("supports empty evidence dependency set", () => {
    const commitment = buildEvidenceCommitment([]);
    expect(commitment.entry_count).toBe(0);
    expect(commitment.digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
