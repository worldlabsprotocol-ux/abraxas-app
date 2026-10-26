// FILE: lib/persistence/boundary/staging/build834Fixtures.ts

import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  type ReceiptSigningKeyPair,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { publishSignedIssuerAuthorityFromRegistry } from "../issuerAuthority/buildFromRegistry";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "../trustDistribution/publishSignedReceiptStatus";
import { buildTrustAnchorBundleV1 } from "../trustDistribution/buildTrustAnchorBundle";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatementForTests,
  verifyAbraxasReceiptIndependently,
} from "@abraxas/independent-verifier";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";

export function registryEnv(
  receiptKey: ReceiptSigningKeyPair,
  anchorKey: ReceiptSigningKeyPair,
  baseEnv: Record<string, string | undefined>,
): Record<string, string> {
  const pub = receiptKey.publicKeyJwk;
  return {
    ...baseEnv,
    ABRAXAS_SIGNING_KEY: JSON.stringify(receiptKey.privateKeyJwk),
    ABRAXAS_SIGNING_KEY_ID: receiptKey.signingKeyId,
    VERCEL_ENV: "preview",
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: receiptKey.signingKeyId,
        environment: "demo",
        status: "active",
        public_jwk: pub,
        fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "build834-trust-anchor",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify(anchorKey.privateKeyJwk),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchorKey.publicKeyJwk),
  } as Record<string, string>;
}

export function syntheticSandboxReceipt(receiptKey: ReceiptSigningKeyPair): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_build834_synthetic",
    decision_id: "00000000-0000-4000-8000-000000008834",
    policy_id: "policy-build834",
    policy_version: 1,
    partner_id: "partner-build834",
    subject_pseudonym_id: subjectPseudonymId("synthetic-build834"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["synthetic_sandbox_fixture"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, receiptKey.privateKeyJwk);
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
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    issuance_finalized_at: payload.evaluated_at,
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: receiptKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
  };
}

/** Portable contract tests — no authoritative validity store (independent verifier only). */
export async function verifyThreeLayerPortableFixture(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string | undefined>;
  anchorKey: ReceiptSigningKeyPair;
  registryVersion: number;
}) {
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: input.registryVersion,
    anchorKeyId: "build834-trust-anchor",
    anchorPrivateJwk: input.anchorKey.privateKeyJwk,
    env: input.env,
  });
  if (!("payload" in signedIssuer)) throw new Error(signedIssuer.reason);
  const statusPrivateRaw = input.env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK?.trim();
  if (!statusPrivateRaw) throw new Error("status_signer_private_jwk_missing");
  const statusSignerPrivateJwk = JSON.parse(statusPrivateRaw) as JsonWebKey;
  const checkedAt = new Date().toISOString();
  const issuedAt = new Date();
  const signedStatus = signReceiptStatusStatementForTests({
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: input.record.id,
      status_reference: input.record.id,
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      policy_version: input.record.policy_version,
      environment: "demo",
      status_version: 1,
      supersedes_status_version: null,
      receipt_status: "active",
      superseded: false,
      partner_operational: true,
      policy_active: true,
      claims_current: true,
      evidence_current: true,
      effective_at: checkedAt,
      issued_at: issuedAt.toISOString(),
      statement_expires_at: new Date(issuedAt.getTime() + 3600_000).toISOString(),
      status_signer_key_id: input.env.ABRAXAS_STATUS_SIGNER_KEY_ID?.trim() ?? "abraxas-status-signer",
    },
    statusSignerPrivateJwk,
  });
  const bundle = buildTrustAnchorBundleV1({
    anchorKeyId: "build834-trust-anchor",
    anchorPublicJwk: input.anchorKey.publicKeyJwk,
    environment: "demo",
    statusStatementMaxAgeSeconds: 3600,
  });
  return verifyAbraxasReceiptIndependently({
    record: toIndependentVerifierRecord(input.record),
    pinnedTrustAnchor: bundle,
    signedIssuerAuthority: signedIssuer,
    relyingParty: {
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      environment: "demo",
    },
    statementObservedAt: new Date().toISOString(),
    signedStatusStatement: signedStatus,
  });
}

export async function verifyThreeLayer(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string | undefined>;
  anchorKey: ReceiptSigningKeyPair;
  registryVersion: number;
}) {
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: input.registryVersion,
    anchorKeyId: "build834-trust-anchor",
    anchorPrivateJwk: input.anchorKey.privateKeyJwk,
    env: input.env,
  });
  if (!("payload" in signedIssuer)) throw new Error(signedIssuer.reason);
  const evaluation = await evaluateSovereignCurrentValidity({
    record: input.record,
    signedIssuerAuthority: signedIssuer,
    trustAnchorPublicJwk: input.anchorKey.publicKeyJwk,
    expectedEnvironment: "demo",
    env: input.env,
  });
  const signedStatus = await publishSignedReceiptStatusFromSovereignEvaluation({
    record: input.record,
    evaluation,
    signedIssuerAuthorityEnvironment: "demo",
    env: input.env,
  });
  if (!("payload" in signedStatus)) throw new Error(signedStatus.reason);
  const bundle = buildTrustAnchorBundleV1({
    anchorKeyId: "build834-trust-anchor",
    anchorPublicJwk: input.anchorKey.publicKeyJwk,
    environment: "demo",
    statusStatementMaxAgeSeconds: 3600,
  });
  return verifyAbraxasReceiptIndependently({
    record: toIndependentVerifierRecord(input.record),
    pinnedTrustAnchor: bundle,
    signedIssuerAuthority: signedIssuer,
    relyingParty: {
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      environment: "demo",
    },
    statementObservedAt: new Date().toISOString(),
    signedStatusStatement: signedStatus,
  });
}
