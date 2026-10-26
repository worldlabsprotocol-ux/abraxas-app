// FILE: lib/partner/trustExecution/executeTrustExecutionFixture.internal.ts
/** @test-only — synthetic signing and fixture SIAS; never import from deployable HTTP routes directly. */

import { randomUUID } from "node:crypto";
import { deriveEvidenceIntegrityVerdict } from "@/lib/decisionReceipts/evidenceIntegrityContract";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  loadReceiptSigningKey,
  signReceiptPayload,
  type ReceiptSigningKeyPair,
} from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";
import { verifyThreeLayerPortableFixture } from "@/lib/persistence/boundary/staging/build834Fixtures";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatementForTests,
} from "@abraxas/independent-verifier";
import type { ConsumedTrustAuthorization } from "./trustExecutionTypes";
import type { TrustExecutionVerificationMaterial } from "./trustExecutionTypes";
import { finalizeTrustExecutionOutcome } from "./finalizeTrustExecutionOutcome";

export function buildFixturePortableVerificationArtifacts(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string | undefined>;
  anchorKey: ReceiptSigningKeyPair;
  registryVersion: number;
}): TrustExecutionVerificationMaterial {
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: input.registryVersion,
    anchorKeyId: "build834-trust-anchor",
    anchorPrivateJwk: input.anchorKey.privateKeyJwk,
    env: input.env,
  });
  if (!("payload" in signedIssuer)) {
    throw new Error(signedIssuer.reason);
  }
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
  return {
    portable_receipt: toIndependentVerifierRecord(input.record),
    signed_issuer_authority: signedIssuer,
    signed_status_statement: signedStatus,
  };
}

export async function executeTrustExecutionFixtureDecision(input: {
  auth: ConsumedTrustAuthorization;
  partnerId: string;
  env: Record<string, string | undefined>;
}): Promise<
  | {
      ok: true;
      receipt: DecisionReceiptRecord;
      verification_material: TrustExecutionVerificationMaterial;
      outcome_created: boolean;
    }
  | { ok: false; code: string; decision_result?: "denied" | "indeterminate" }
> {
  const evidenceVerdict = deriveEvidenceIntegrityVerdict({
    receipt_id: `pending_${input.auth.challenge_id}`,
    subject_pseudonym_id: input.auth.subject_pseudonym_id,
    expected_subject_pseudonym_id: input.auth.subject_pseudonym_id,
    partner_id: input.auth.partner_id,
    policy_id: input.auth.policy_id,
    source: {
      source_credential_id: `cred_${input.auth.correlation_id}`,
      status: "active",
      expires_at: "2099-01-01T00:00:00.000Z",
      revoked_at: null,
    },
    claims: [
      {
        claim_id: `claim_${input.auth.correlation_id}`,
        status: "active",
        expires_at: "2099-01-01T00:00:00.000Z",
      },
    ],
    store_available: true,
  });

  if (evidenceVerdict.verdict !== "accepted") {
    return {
      ok: false,
      code: evidenceVerdict.reasons.join(",") || "evidence_not_permit",
      decision_result: evidenceVerdict.verdict === "denied" ? "denied" : "indeterminate",
    };
  }

  const signingKey = resolveIssuanceSigningKey({
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    env: input.env,
  });
  if (!signingKey.ok) {
    return { ok: false, code: "fixture_signing_unavailable", decision_result: "indeterminate" };
  }
  const loadedPair = loadReceiptSigningKey();
  if (!loadedPair) {
    return { ok: false, code: "fixture_signing_unavailable", decision_result: "indeterminate" };
  }
  const receiptKey: ReceiptSigningKeyPair = {
    signingKeyId: signingKey.key_id,
    privateKeyJwk: signingKey.privateKeyJwk,
    publicKeyJwk: loadedPair.publicKeyJwk,
  };
  const anchorPubRaw = input.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK?.trim();
  const anchorPrivRaw = input.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK?.trim();
  if (!anchorPubRaw || !anchorPrivRaw) {
    return { ok: false, code: "fixture_trust_anchor_unavailable", decision_result: "indeterminate" };
  }
  const anchorKey: ReceiptSigningKeyPair = {
    signingKeyId: input.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID?.trim() ?? "build834-trust-anchor",
    privateKeyJwk: JSON.parse(anchorPrivRaw) as JsonWebKey,
    publicKeyJwk: JSON.parse(anchorPubRaw) as JsonWebKey,
  };
  const env = input.env;

  const receiptId = `dr_trust_exec_fixture_${input.auth.challenge_id.slice(-12)}`;
  const decisionId = randomUUID();
  const payload = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: decisionId,
    policy_id: input.auth.policy_id,
    policy_version: input.auth.policy_version,
    partner_id: input.auth.partner_id,
    subject_pseudonym_id: input.auth.subject_pseudonym_id,
    wallet_binding_ref: input.auth.wallet_binding_ref,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["trust_execution_controlled_test_evidence"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
  });
  const { payloadHash, signature } = signReceiptPayload(payload, signingKey.privateKeyJwk);
  const record: DecisionReceiptRecord = {
    id: receiptId,
    verification_decision_id: decisionId,
    consent_receipt_id: null,
    partner_id: input.auth.partner_id,
    policy_id: input.auth.policy_id,
    policy_version: input.auth.policy_version,
    subject_pseudonym_id: input.auth.subject_pseudonym_id,
    wallet_binding_ref: input.auth.wallet_binding_ref,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: payload.decision_context,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    issuance_finalized_at: payload.evaluated_at,
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
    payload_hash: payloadHash,
    signature,
    signing_key_id: signingKey.key_id,
    anchor_reference: null,
    idempotency_key: input.auth.correlation_id,
    created_at: payload.evaluated_at,
  };

  const finalized = await finalizeTrustExecutionOutcome({
    authorizationRef: input.auth.wallet_binding_ref,
    partnerId: input.partnerId,
    applicationId: input.auth.application_id,
    challengeId: input.auth.challenge_id,
    correlationId: input.auth.correlation_id,
    record,
    env: input.env,
  });
  if (!finalized.ok) return finalized;

  const portable = await verifyThreeLayerPortableFixture({
    record,
    env,
    anchorKey,
    registryVersion: 854,
  });
  if (!portable.cryptographically_authentic) {
    return { ok: false, code: "fixture_verification_failed", decision_result: "indeterminate" };
  }

  const material = buildFixturePortableVerificationArtifacts({
    record,
    env,
    anchorKey,
    registryVersion: 854,
  });

  return {
    ok: true,
    receipt: record,
    verification_material: material,
    outcome_created: finalized.created,
  };
}
