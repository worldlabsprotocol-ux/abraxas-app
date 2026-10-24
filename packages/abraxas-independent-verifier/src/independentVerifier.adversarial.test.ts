import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  TRUST_ANCHOR_BUNDLE_DOCUMENT,
  TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
  type DecisionReceiptRecord,
  type IssuerAuthorityStatementPayload,
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  type TrustAnchorBundleV1,
} from "./types";
import { publicEd25519JwkFingerprint } from "./fingerprint";
import { signIssuerAuthorityPayloadForTests, verifySignedIssuerAuthorityStatement } from "./issuerAuthorityStatement";
import { signReceiptStatusStatement } from "./signedReceiptStatusStatement";
import { verifyAbraxasReceiptIndependently } from "./verifyIndependent";
import { buildCanonicalPayloadFromRecord, hashCanonicalPayload } from "./canonical";
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
  keyStatus: "active" | "revoked" = "active",
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
        status: keyStatus,
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: receiptKey.publicKeyJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: keyStatus === "revoked",
        historical_verify_until: keyStatus === "revoked" ? "2030-01-01T00:00:00.000Z" : null,
        reason_class: keyStatus,
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

function signedReceipt(receiptKey: ReturnType<typeof keyPair>): DecisionReceiptRecord {
  const base: DecisionReceiptRecord = {
    id: "dr_indep818",
    verification_decision_id: "00000000-0000-4000-8000-000000008818",
    consent_receipt_id: null,
    partner_id: "partner-818",
    policy_id: "policy-818",
    policy_version: 1,
    subject_pseudonym_id: "subj-818",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [{ claim_id: "claim-1", claim_type: "age21", status: "active" }],
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
  const sig = nacl.sign.detached(message, nacl.sign.keyPair.fromSeed(
    Buffer.from(receiptKey.privateKeyJwk.d!, "base64url"),
  ).secretKey);
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

describe("independent verifier (no Abraxas backend)", () => {
  const anchor = keyPair("anchor");
  const receiptKey = keyPair("receipt-signer");
  const statusSigner = keyPair("status-signer");
  const bundle = trustBundle(anchor);

  it("accepts authentic receipt with pinned anchor and signed status evidence", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const record = signedReceipt(receiptKey);
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(record, statusSigner),
      minimumRegistryVersion: 1,
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.issuer_currently_authorized).toBe(true);
    expect(result.status_evidence_authentic).toBe(true);
    expect(result.currently_acceptable).toBe("yes");
  });

  it("rejects forged authority statement signature", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const forged = { ...statement, signature: statement.signature.slice(0, -2) + "xx" };
    const v = verifySignedIssuerAuthorityStatement({
      statement: forged,
      trustAnchorPublicJwk: anchor.publicKeyJwk,
    });
    expect(v.ok).toBe(false);
  });

  it("rejects unknown anchor fingerprint", () => {
    const badBundle = { ...bundle, public_key_fingerprint: "0".repeat(64) };
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record: signedReceipt(receiptKey),
      pinnedTrustAnchor: badBundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(signedReceipt(receiptKey), statusSigner),
    });
    expect(result.failure_codes).toContain("anchor_fingerprint_mismatch");
  });

  it("rejects anchor substitution in statement", () => {
    const otherAnchor = keyPair("other-anchor");
    const statement = signIssuerAuthorityPayloadForTests({
      payload: { ...statementPayload(receiptKey, statusSigner, 2), anchor_key_id: "other-anchor-id" },
      anchorPrivateJwk: otherAnchor.privateKeyJwk,
    });
    statement.anchor_key_id = "other-anchor-id";
    const result = verifyAbraxasReceiptIndependently({
      record: signedReceipt(receiptKey),
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(signedReceipt(receiptKey), statusSigner),
    });
    expect(result.failure_codes).toContain("anchor_substitution_rejected");
  });

  it("rejects registry version rollback", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 1),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record: signedReceipt(receiptKey),
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(signedReceipt(receiptKey), statusSigner),
      minimumRegistryVersion: 5,
    });
    expect(result.failure_codes).toContain("registry_version_rollback_rejected");
  });

  it("allows historical signature but not current authorization when key revoked", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 3, "revoked"),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const record = signedReceipt(receiptKey);
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(record, statusSigner),
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.issuer_currently_authorized).toBe(false);
    expect(result.currently_acceptable).toBe("no");
  });

  it("rejects wrong audience", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record: signedReceipt(receiptKey),
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "wrong-partner", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(signedReceipt(receiptKey), statusSigner),
    });
    expect(result.failure_codes).toContain("audience_mismatch");
  });

  it("returns indeterminate without signed status evidence", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const result = verifyAbraxasReceiptIndependently({
      record: signedReceipt(receiptKey),
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: null,
    });
    expect(result.currently_acceptable).toBe("indeterminate");
    expect(result.failure_codes).toContain("signed_status_evidence_required");
  });

  it("rejects tampered receipt payload", () => {
    const statement = signIssuerAuthorityPayloadForTests({
      payload: statementPayload(receiptKey, statusSigner, 2),
      anchorPrivateJwk: anchor.privateKeyJwk,
    });
    const record = signedReceipt(receiptKey);
    record.decision_result = "denied";
    const result = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: statement,
      relyingParty: { partner_id: "partner-818", policy_id: "policy-818", environment: "production" },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatusFor(record, statusSigner),
    });
    expect(result.failure_codes).toContain("payload_tampered");
  });
});
