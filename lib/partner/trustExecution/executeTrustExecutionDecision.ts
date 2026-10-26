// FILE: lib/partner/trustExecution/executeTrustExecutionDecision.ts

import { randomUUID } from "node:crypto";
import { deriveEvidenceIntegrityVerdict } from "@/lib/decisionReceipts/evidenceIntegrityContract";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import {
  registryEnv,
  verifyThreeLayerPortableFixture,
} from "@/lib/persistence/boundary/staging/build834Fixtures";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

export async function loadConsumedAuthorization(input: {
  authorizationRef: string;
  partnerId: string;
}): Promise<
  | {
      ok: true;
      challenge_id: string;
      partner_id: string;
      application_id: string;
      policy_id: string;
      policy_version: number;
      correlation_id: string;
      wallet_binding_ref: string;
    }
  | { ok: false; code: string }
> {
  const result = await querySovereignStagingPg<{
    id: string;
    partner_id: string;
    application_id: string;
    policy_id: string;
    policy_version: number;
    correlation_id: string;
    authorization_ref: string | null;
    consumed_at: string | null;
  }>(
    `select id, partner_id, application_id, policy_id, policy_version, correlation_id, authorization_ref, consumed_at
     from public.wallet_scoped_trust_challenges
     where authorization_ref = $1 and partner_id = $2 and consumed_at is not null
     limit 1`,
    [input.authorizationRef, input.partnerId],
  );
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  const row = result.rows[0];
  if (!row?.authorization_ref) return { ok: false, code: "authorization_not_found" };
  return {
    ok: true,
    challenge_id: row.id,
    partner_id: row.partner_id,
    application_id: row.application_id,
    policy_id: row.policy_id,
    policy_version: row.policy_version,
    correlation_id: row.correlation_id,
    wallet_binding_ref: row.authorization_ref,
  };
}

export async function executeTrustExecutionDecision(input: {
  partnerId: string;
  authorizationRef: string;
  subjectPseudonymSeed: string;
  controlledTestEvidence?: boolean;
  env?: Record<string, string | undefined>;
}): Promise<
  | {
      ok: true;
      receipt: DecisionReceiptRecord;
      decision_result: "approved" | "denied" | "indeterminate";
      independent_verification: IndependentVerificationResult;
    }
  | { ok: false; code: string; decision_result?: "denied" | "indeterminate" }
> {
  const auth = await loadConsumedAuthorization({
    authorizationRef: input.authorizationRef,
    partnerId: input.partnerId,
  });
  if (!auth.ok) return { ok: false, code: auth.code };

  const subjectId = subjectPseudonymId(input.subjectPseudonymSeed);
  const evidenceLabel = input.controlledTestEvidence ? "controlled_test_evidence" : "live_authoritative_evidence";

  const evidenceVerdict = deriveEvidenceIntegrityVerdict({
    receipt_id: `pending_${auth.challenge_id}`,
    subject_pseudonym_id: subjectId,
    expected_subject_pseudonym_id: subjectId,
    partner_id: auth.partner_id,
    policy_id: auth.policy_id,
    source: input.controlledTestEvidence
      ? {
          source_credential_id: `cred_${auth.correlation_id}`,
          status: "active",
          expires_at: "2099-01-01T00:00:00.000Z",
          revoked_at: null,
        }
      : null,
    claims: input.controlledTestEvidence
      ? [{ claim_id: `claim_${auth.correlation_id}`, status: "active", expires_at: "2099-01-01T00:00:00.000Z" }]
      : [],
    store_available: true,
  });

  if (evidenceVerdict.verdict === "denied" || evidenceVerdict.verdict === "indeterminate") {
    return {
      ok: false,
      code: evidenceVerdict.reasons.join(",") || "evidence_not_permit",
      decision_result: evidenceVerdict.verdict === "denied" ? "denied" : "indeterminate",
    };
  }

  const receiptKey = generateTestSigningKeyPair("trust-exec-854");
  const anchorKey = generateTestSigningKeyPair("trust-exec-854-anchor");
  const receiptId = `dr_trust_exec_${auth.challenge_id.slice(-16)}`;
  const decisionId = randomUUID();
  const payload = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: decisionId,
    policy_id: auth.policy_id,
    policy_version: auth.policy_version,
    partner_id: auth.partner_id,
    subject_pseudonym_id: subjectId,
    wallet_binding_ref: auth.wallet_binding_ref,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [`trust_execution_${evidenceLabel}`],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
  });
  const { payloadHash, signature } = signReceiptPayload(payload, receiptKey.privateKeyJwk);
  const record: DecisionReceiptRecord = {
    id: receiptId,
    verification_decision_id: decisionId,
    consent_receipt_id: null,
    partner_id: auth.partner_id,
    policy_id: auth.policy_id,
    policy_version: auth.policy_version,
    subject_pseudonym_id: subjectId,
    wallet_binding_ref: auth.wallet_binding_ref,
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
    signing_key_id: receiptKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: auth.correlation_id,
    created_at: payload.evaluated_at,
  };

  await querySovereignStagingPg(
    `insert into public.issuer_signing_keys (signing_key_id, status) values ($1, 'active')
     on conflict (signing_key_id) do nothing`,
    [record.signing_key_id],
  );
  await querySovereignStagingPg(
    `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
     values ($1, $2, $3, 'trust-exec', '{}', 'active')
     on conflict (id, version) do nothing`,
    [auth.policy_id, auth.partner_id, auth.policy_version],
  );

  const insert = await querySovereignStagingPg(
    `insert into public.decision_receipts (
       id, verification_decision_id, partner_id, policy_id, policy_version,
       subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes,
       evaluated_claim_refs, issuer_refs, decision_context, evaluated_at, expires_at,
       status, issuance_finalized_at, schema_version, payload_hash, signature, signing_key_id, created_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
     ) on conflict (id) do nothing`,
    [
      record.id,
      record.verification_decision_id,
      record.partner_id,
      record.policy_id,
      record.policy_version,
      record.subject_pseudonym_id,
      record.wallet_binding_ref,
      record.decision_result,
      record.reason_codes,
      JSON.stringify(record.evaluated_claim_refs),
      record.issuer_refs,
      record.decision_context,
      record.evaluated_at,
      record.expires_at,
      record.status,
      record.issuance_finalized_at,
      record.schema_version,
      record.payload_hash,
      record.signature,
      record.signing_key_id,
      record.created_at,
    ],
  );
  if ("error" in insert) throw new ScopedChallengeStoreUnavailableError(insert.error);

  await querySovereignStagingPg(
    `insert into public.partner_launchpad_signed_receipts (receipt_id, application_id, partner_id)
     values ($1, $2::uuid, $3)
     on conflict (receipt_id) do nothing`,
    [record.id, auth.application_id, auth.partner_id],
  );

  const statusSignerKey = generateTestSigningKeyPair("build854-status");
  const env = {
    ...registryEnv(receiptKey, anchorKey, input.env ?? process.env),
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
  };

  const independent = await verifyThreeLayerPortableFixture({
    record,
    env,
    anchorKey,
    registryVersion: 854,
  });

  return {
    ok: true,
    receipt: record,
    decision_result: "approved",
    independent_verification: independent,
  };
}
