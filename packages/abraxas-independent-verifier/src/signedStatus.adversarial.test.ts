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
} from "./types";
import { publicEd25519JwkFingerprint } from "./fingerprint";
import { signIssuerAuthorityPayloadForTests } from "./issuerAuthorityStatement";
import { signReceiptStatusStatement, verifySignedReceiptStatusStatement } from "./signedReceiptStatusStatement";
import { verifyAbraxasReceiptIndependently } from "./verifyIndependent";
import { buildCanonicalPayloadFromRecord, hashCanonicalPayload } from "./canonical";

function keyPair(id: string) {
  const kp = nacl.sign.keyPair();
  const privateKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: Buffer.from(kp.publicKey).toString("base64url"),
    d: Buffer.from(kp.secretKey.slice(0, 32)).toString("base64url"),
  };
  const publicKeyJwk: JsonWebKey = { kty: "OKP", crv: "Ed25519", x: privateKeyJwk.x! };
  return { id, privateKeyJwk, publicKeyJwk, signingKeyId: id };
}

function bundle(anchor: ReturnType<typeof keyPair>): TrustAnchorBundleV1 {
  return {
    document: TRUST_ANCHOR_BUNDLE_DOCUMENT,
    schema_version: TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
    anchor_key_id: "anchor",
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

function issuerPayload(
  receiptKey: ReturnType<typeof keyPair>,
  statusSigner: ReturnType<typeof keyPair>,
  statusSignerRevoked = false,
): IssuerAuthorityStatementPayload {
  return {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: 2,
    supersedes_registry_version: 1,
    environment: "production",
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: "anchor",
    keys: [
      {
        key_id: receiptKey.signingKeyId,
        environment: "production",
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: receiptKey.publicKeyJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      },
    ],
    status_signers: [
      {
        key_id: "status-signer-1",
        environment: "production",
        status: statusSignerRevoked ? "revoked" : "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: statusSigner.publicKeyJwk,
        reason_class: statusSignerRevoked ? "revoked" : "active",
      },
    ],
  };
}

function receipt(receiptKey: ReturnType<typeof keyPair>): DecisionReceiptRecord {
  const base: DecisionReceiptRecord = {
    id: "dr_status819",
    verification_decision_id: "00000000-0000-4000-8000-000000008819",
    consent_receipt_id: null,
    partner_id: "partner-819",
    policy_id: "policy-819",
    policy_version: 1,
    subject_pseudonym_id: "subj-x",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
    status: "active",
    schema_version: "1.0.0",
    payload_hash: "",
    signature: "",
    signing_key_id: receiptKey.signingKeyId,
  };
  const payload = buildCanonicalPayloadFromRecord(base);
  const payload_hash = hashCanonicalPayload(payload);
  const message = Buffer.from(payload_hash, "hex");
  const secret = nacl.sign.keyPair.fromSeed(Buffer.from(receiptKey.privateKeyJwk.d!, "base64url")).secretKey;
  const sig = nacl.sign.detached(message, secret);
  return { ...base, payload_hash, signature: Buffer.from(sig).toString("base64url") };
}

function signedStatus(
  record: DecisionReceiptRecord,
  statusSigner: ReturnType<typeof keyPair>,
  input: { version: number; receipt_status?: "active" | "revoked" | "expired"; partner_id?: string },
) {
  const issued = new Date();
  const expires = new Date(issued.getTime() + 300_000);
  return signReceiptStatusStatement({
    statusSignerPrivateJwk: statusSigner.privateKeyJwk,
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: record.id,
      status_reference: record.id,
      partner_id: input.partner_id ?? record.partner_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      environment: "production",
      status_version: input.version,
      supersedes_status_version: input.version > 1 ? input.version - 1 : null,
      receipt_status: input.receipt_status ?? "active",
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

describe("signed status evidence (#819)", () => {
  const anchor = keyPair("anchor");
  const receiptKey = keyPair("receipt");
  const statusSigner = keyPair("status");
  const untrustedSigner = keyPair("untrusted");

  it("rejects unsigned status JSON", () => {
    const issuer = signIssuerAuthorityPayloadForTests({
      payload: issuerPayload(receiptKey, statusSigner),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record: receipt(receiptKey),
      pinnedTrustAnchor: bundle(anchor),
      signedIssuerAuthority: issuer,
      relyingParty: { partner_id: "partner-819", policy_id: "policy-819", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      statusEvidence: {
        document: "abraxas_receipt_status_evidence",
        schema_version: "1.0.0",
        receipt_id: "dr_status819",
        observed_at: new Date().toISOString(),
        receipt_status: "active",
        superseded: false,
        partner_operational: true,
        policy_active: true,
        claims_current: true,
        evidence_current: true,
      },
    });
    expect(result.failure_codes).toContain("unsigned_status_evidence_rejected");
    expect(result.status_evidence_authentic).toBe(false);
  });

  it("rejects forged status statement signature", () => {
    const issuer = signIssuerAuthorityPayloadForTests({
      payload: issuerPayload(receiptKey, statusSigner),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const status = signedStatus(receipt(receiptKey), statusSigner, { version: 1 });
    status.signature = `${status.signature.slice(0, -2)}xx`;
    const v = verifySignedReceiptStatusStatement({
      signedStatus: status,
      signedIssuerAuthority: issuer,
    });
    expect(v.ok).toBe(false);
  });

  it("rejects unauthorized status signer", () => {
    const issuer = signIssuerAuthorityPayloadForTests({
      payload: issuerPayload(receiptKey, statusSigner),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const issued = new Date();
    const expires = new Date(issued.getTime() + 300_000);
    const rec = receipt(receiptKey);
    const status = signReceiptStatusStatement({
      statusSignerPrivateJwk: untrustedSigner.privateKeyJwk,
      payload: {
        document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
        schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
        receipt_id: rec.id,
        status_reference: rec.id,
        partner_id: rec.partner_id,
        policy_id: rec.policy_id,
        policy_version: rec.policy_version,
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
        status_signer_key_id: "unauthorized-signer-id",
      },
    });
    const v = verifySignedReceiptStatusStatement({
      signedStatus: status,
      signedIssuerAuthority: issuer,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("unknown_status_signer");
  });

  it("rejects status version rollback", () => {
    const issuer = signIssuerAuthorityPayloadForTests({
      payload: issuerPayload(receiptKey, statusSigner),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const status = signedStatus(receipt(receiptKey), statusSigner, { version: 2 });
    const v = verifySignedReceiptStatusStatement({
      signedStatus: status,
      signedIssuerAuthority: issuer,
      minimumStatusVersion: 5,
    });
    expect(v.ok).toBe(false);
  });

  it("accepts higher status version after revocation superseded prior approval", () => {
    const issuer = signIssuerAuthorityPayloadForTests({
      payload: issuerPayload(receiptKey, statusSigner),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const rec = receipt(receiptKey);
    const stale = signedStatus(rec, statusSigner, { version: 3, receipt_status: "active" });
    const fresh = signedStatus(rec, statusSigner, { version: 4, receipt_status: "revoked" });
    const staleResult = verifyAbraxasReceiptIndependently({
      record: rec,
      pinnedTrustAnchor: bundle(anchor),
      signedIssuerAuthority: issuer,
      relyingParty: { partner_id: "partner-819", policy_id: "policy-819", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: stale,
      minimumStatusVersion: 4,
    });
    expect(staleResult.failure_codes).toContain("status_version_rollback_rejected");
    const freshResult = verifyAbraxasReceiptIndependently({
      record: rec,
      pinnedTrustAnchor: bundle(anchor),
      signedIssuerAuthority: issuer,
      relyingParty: { partner_id: "partner-819", policy_id: "policy-819", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: fresh,
      minimumStatusVersion: 3,
    });
    expect(freshResult.status_evidence_authentic).toBe(true);
    expect(freshResult.currently_acceptable).toBe("no");
  });

  it("rejects cross-tenant status reuse", () => {
    const issuer = signIssuerAuthorityPayloadForTests({
      payload: issuerPayload(receiptKey, statusSigner),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const rec = receipt(receiptKey);
    const status = signedStatus(rec, statusSigner, { version: 1, partner_id: "other-partner" });
    const result = verifyAbraxasReceiptIndependently({
      record: rec,
      pinnedTrustAnchor: bundle(anchor),
      signedIssuerAuthority: issuer,
      relyingParty: { partner_id: "partner-819", policy_id: "policy-819", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: status,
    });
    expect(result.failure_codes).toContain("status_partner_mismatch");
  });
});
