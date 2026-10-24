/**
 * Package-only synthetic sandbox fixtures for integration-first relying parties.
 * No Abraxas app backend imports — safe to copy into partner repos with the verifier package.
 */
import nacl from "tweetnacl";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  TRUST_ANCHOR_BUNDLE_DOCUMENT,
  TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  type DecisionReceiptRecord,
  type IssuerAuthorityStatementPayload,
  type SignedIssuerAuthorityStatement,
  type SignedReceiptStatusStatement,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";
import { publicEd25519JwkFingerprint } from "../../packages/abraxas-independent-verifier/src/fingerprint";
import { signIssuerAuthorityPayloadForTests } from "../../packages/abraxas-independent-verifier/src/issuerAuthorityStatement";
import { signReceiptStatusStatement } from "../../packages/abraxas-independent-verifier/src/signedReceiptStatusStatement";
import { buildCanonicalPayloadFromRecord, hashCanonicalPayload } from "../../packages/abraxas-independent-verifier/src/canonical";

export const BUILD_821_PARTNER_ID = "partner-integration-821";
export const BUILD_821_POLICY_ID = "policy-age21-sandbox-821";
export const BUILD_821_ENVIRONMENT = "demo" as const;

function keyPairFromSeed(seedByte: number, signingKeyId: string) {
  const seed = Buffer.alloc(32, seedByte);
  const kp = nacl.sign.keyPair.fromSeed(seed);
  const privateKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: Buffer.from(kp.publicKey).toString("base64url"),
    d: Buffer.from(kp.secretKey.slice(0, 32)).toString("base64url"),
  };
  const publicKeyJwk: JsonWebKey = { kty: "OKP", crv: "Ed25519", x: privateKeyJwk.x! };
  return { signingKeyId, privateKeyJwk, publicKeyJwk };
}

const ANCHOR = keyPairFromSeed(11, "build821-trust-anchor");
const RECEIPT_KEY = keyPairFromSeed(22, "build821-receipt-signer");
const STATUS_SIGNER = keyPairFromSeed(33, "build821-status-signer");

export function build821TrustAnchorBundle(): TrustAnchorBundleV1 {
  return {
    document: TRUST_ANCHOR_BUNDLE_DOCUMENT,
    schema_version: TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
    anchor_key_id: ANCHOR.signingKeyId,
    public_jwk: ANCHOR.publicKeyJwk,
    public_key_fingerprint: publicEd25519JwkFingerprint(ANCHOR.publicKeyJwk)!,
    environment: BUILD_821_ENVIRONMENT,
    effective_from: "2020-01-01T00:00:00.000Z",
    distribution: "out_of_band",
    /** Sandbox fixtures only — production integrators pin tighter freshness. */
    statement_cache_max_age_seconds: 31_536_000,
    status_statement_max_age_seconds: 31_536_000,
    minimum_registry_version_hint: null,
  };
}

function issuerPayload(registryVersion: number): IssuerAuthorityStatementPayload {
  return {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: registryVersion,
    supersedes_registry_version: registryVersion > 1 ? registryVersion - 1 : null,
    environment: BUILD_821_ENVIRONMENT,
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: ANCHOR.signingKeyId,
    keys: [
      {
        key_id: RECEIPT_KEY.signingKeyId,
        environment: BUILD_821_ENVIRONMENT,
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: RECEIPT_KEY.publicKeyJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      },
    ],
    status_signers: [
      {
        key_id: STATUS_SIGNER.signingKeyId,
        environment: BUILD_821_ENVIRONMENT,
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: STATUS_SIGNER.publicKeyJwk,
        reason_class: "active",
      },
    ],
  };
}

export function build821SignedIssuerAuthority(registryVersion = 2): SignedIssuerAuthorityStatement {
  return signIssuerAuthorityPayloadForTests({
    payload: issuerPayload(registryVersion),
    anchorPrivateJwk: ANCHOR.privateKeyJwk,
  });
}

export function build821DecisionReceipt(): DecisionReceiptRecord {
  const base: DecisionReceiptRecord = {
    id: "dr_build821_integration_synthetic",
    verification_decision_id: "00000000-0000-4000-8000-000000008821",
    consent_receipt_id: null,
    partner_id: BUILD_821_PARTNER_ID,
    policy_id: BUILD_821_POLICY_ID,
    policy_version: 1,
    subject_pseudonym_id: "synthetic-subject-821",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["synthetic_sandbox_fixture"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2030-06-01T12:00:00.000Z",
    revoked_at: null,
    status: "active",
    schema_version: "1.0.0",
    payload_hash: "",
    signature: "",
    signing_key_id: RECEIPT_KEY.signingKeyId,
  };
  const payload = buildCanonicalPayloadFromRecord(base);
  const payload_hash = hashCanonicalPayload(payload);
  const message = Buffer.from(payload_hash, "hex");
  const sig = nacl.sign.detached(
    message,
    nacl.sign.keyPair.fromSeed(Buffer.alloc(32, 22)).secretKey,
  );
  return { ...base, payload_hash, signature: Buffer.from(sig).toString("base64url") };
}

export function build821SignedStatus(
  record: DecisionReceiptRecord,
  input?: { status_version?: number; receipt_status?: "active" | "revoked" | "expired" },
): SignedReceiptStatusStatement {
  return signReceiptStatusStatement({
    statusSignerPrivateJwk: STATUS_SIGNER.privateKeyJwk,
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: record.id,
      status_reference: record.id,
      partner_id: record.partner_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      environment: BUILD_821_ENVIRONMENT,
      status_version: input?.status_version ?? 1,
      supersedes_status_version: input?.status_version && input.status_version > 1 ? input.status_version - 1 : null,
      receipt_status: input?.receipt_status ?? "active",
      superseded: false,
      partner_operational: true,
      policy_active: true,
      claims_current: true,
      evidence_current: true,
      effective_at: "2026-06-01T12:00:00.000Z",
      issued_at: "2026-06-01T12:00:00.000Z",
      statement_expires_at: "2030-06-01T12:00:00.000Z",
      status_signer_key_id: STATUS_SIGNER.signingKeyId,
    },
  });
}

export function build821SyntheticFixtureSet() {
  const record = build821DecisionReceipt();
  return {
    manifest: {
      build: 821,
      label: "synthetic_sandbox_only",
      partner_id: BUILD_821_PARTNER_ID,
      policy_id: BUILD_821_POLICY_ID,
      environment: BUILD_821_ENVIRONMENT,
      receipt_id: record.id,
      not_for_production: true,
    },
    trust_anchor_bundle: build821TrustAnchorBundle(),
    issuer_authority_statement: build821SignedIssuerAuthority(),
    decision_receipt: record,
    signed_status_statement: build821SignedStatus(record),
    signed_status_statement_revoked: build821SignedStatus(record, {
      status_version: 2,
      receipt_status: "revoked",
    }),
  };
}
