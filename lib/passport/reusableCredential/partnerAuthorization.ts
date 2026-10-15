// FILE: lib/passport/reusableCredential/partnerAuthorization.ts

import { randomBytes } from "crypto";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { signReceiptPayload, type ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { DecisionReceiptRecord, EvaluatedClaimRef } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  composeHolderPolicyScopedPresentation,
  type HolderPolicyScopedPresentation,
} from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import type {
  PortableRevocationBootstrapTrust,
  PortableRevocationCheckpointStore,
  PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import type { ReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { InMemoryReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { materializeAuthenticatedClaimsForPolicy } from "./authenticatedClaims";
import type { SignedPassportReusableCredential } from "./contract";
import {
  type HolderPossessionProof,
  type PassportPossessionChallengePayload,
  type PassportPossessionChallengeStore,
  verifyPassportPossessionProof,
  verifyPassportPossessionProofAsync,
} from "./holderPossessionChallenge";
import { verifyPassportReusableCredentialStrict } from "./verify";

export type PartnerAuthorizationFromCredentialInput = {
  credential: SignedPassportReusableCredential;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyRules: PartnerPolicyRules;
  requestId: string;
  receiptSigningKey: ReceiptSigningKeyPair;
  portableRevocationSnapshot: PortableRevocationSignedArtifact;
  possessionChallenge: PassportPossessionChallengePayload;
  holderPossessionProof: HolderPossessionProof;
  checkpointStore: PortableRevocationCheckpointStore;
  bootstrapTrusts?: PortableRevocationBootstrapTrust[];
  consumptionStore?: ReceiptConsumptionStore;
  challengeStore?: PassportPossessionChallengeStore;
  durablePossessionConsume?: (
    challengeId: string,
    at: string,
  ) => Promise<{ ok: true } | { ok: false; code: "unknown" | "expired" | "replay" }>;
  consentReceiptId?: string | null;
  /** Possession challenge and signature were verified and consumed in a prior atomic commit. */
  possessionAlreadyCommitted?: boolean;
  deterministicReceiptIds?: { receiptId: string; decisionId: string };
  now?: Date;
  env?: Record<string, string | undefined>;
};

export type PartnerAuthorizationFromCredentialResult =
  | {
      ok: true;
      receipt: DecisionReceiptRecord;
      presentation: HolderPolicyScopedPresentation;
      policy_evaluation: { approved: true; reason_codes: string[] };
      idv_repeated: false;
      decision_context: "sandbox_only" | "production";
    }
  | {
      ok: false;
      code: string;
      policy_evaluation?: { approved: false; missing_claims: string[] };
    };

function toEvaluatedClaimRefs(claims: CredentialClaimRecord[]): EvaluatedClaimRef[] {
  return claims.map((c) => ({
    claim_id: c.id,
    claim_type: c.claim_type,
    issuer_id: c.issuer_id,
    status: c.status,
    issued_at: c.issued_at,
    expires_at: c.expires_at,
  }));
}

function isSyntheticCredential(credential: SignedPassportReusableCredential): boolean {
  return credential.payload.provenance.idv_method === "sandbox_fixture";
}

export async function authorizePartnerFromReusableCredential(
  input: PartnerAuthorizationFromCredentialInput,
): Promise<PartnerAuthorizationFromCredentialResult> {
  const now = input.now ?? new Date();
  const bootstrap = input.bootstrapTrusts ?? [];

  if (!input.possessionAlreadyCommitted) {
    const possession = input.durablePossessionConsume
      ? await verifyPassportPossessionProofAsync({
          credentialId: input.credential.payload.credential_id,
          partnerId: input.partnerId,
          policyId: input.policyId,
          credentialHolderPublicKey: input.credential.payload.holder_possession_public_key,
          challenge: input.possessionChallenge,
          proof: input.holderPossessionProof,
          now,
          store: input.challengeStore,
          durableConsume: input.durablePossessionConsume,
        })
      : verifyPassportPossessionProof({
          credentialId: input.credential.payload.credential_id,
          partnerId: input.partnerId,
          policyId: input.policyId,
          credentialHolderPublicKey: input.credential.payload.holder_possession_public_key,
          challenge: input.possessionChallenge,
          proof: input.holderPossessionProof,
          now,
          store: input.challengeStore,
        });
    if (!possession.ok) {
      return { ok: false, code: possession.code };
    }
  }

  const verified = await verifyPassportReusableCredentialStrict({
    credential: input.credential,
    now,
    env: input.env,
    portableRevocationSnapshot: input.portableRevocationSnapshot,
    checkpointStore: input.checkpointStore,
    bootstrapTrusts: bootstrap,
  });
  if (!verified.ok) {
    return { ok: false, code: verified.code };
  }

  const materialized = materializeAuthenticatedClaimsForPolicy({
    credential: input.credential,
    policyRules: input.policyRules,
    now,
  });
  if (!materialized.ok) {
    return { ok: false, code: materialized.code };
  }

  const evaluation = evaluatePolicyRules(input.policyRules, materialized.claims, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyRules: input.policyRules,
  });
  if (evaluation.decision !== "approved") {
    return {
      ok: false,
      code: "policy_not_met",
      policy_evaluation: { approved: false, missing_claims: evaluation.missing_claims },
    };
  }

  const synthetic = isSyntheticCredential(input.credential);
  const decisionContext: "sandbox_only" | "production" = synthetic ? "sandbox_only" : "production";
  if (synthetic && !input.policyRules.sandbox_only) {
    return { ok: false, code: "synthetic_credential_requires_sandbox_policy" };
  }

  const store = input.consumptionStore ?? new InMemoryReceiptConsumptionStore();
  const receiptId = input.deterministicReceiptIds?.receiptId ?? `dr_${randomBytes(10).toString("base64url")}`;
  const consumptionAttempt = await store.tryRecordConsumption({
    receiptId,
    requestId: input.requestId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    at: now.toISOString(),
  });
  if (consumptionAttempt.status === "replay") {
    return { ok: false, code: "rp_consumption_replay" };
  }
  if (consumptionAttempt.status === "persistence_unavailable") {
    return { ok: false, code: "rp_consumption_unavailable" };
  }

  const decisionId = input.deterministicReceiptIds?.decisionId ?? randomBytes(16).toString("hex");
  const evaluatedRefs = toEvaluatedClaimRefs(materialized.claims);
  const payload = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: decisionId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    partner_id: input.partnerId,
    subject_pseudonym_id: subjectPseudonymId(
      `${input.credential.payload.holder_subject_id}:${input.partnerId}`,
    ),
    wallet_binding_ref: input.credential.payload.holder_possession_ref,
    consent_receipt_id: input.consentReceiptId ?? null,
    decision_result: "approved",
    reason_codes: evaluation.reason_codes,
    evaluated_claim_refs: evaluatedRefs,
    issuer_refs: [input.credential.payload.issuer_id, CLAIM_ISSUERS.abraxas],
    decision_context: decisionContext,
    evaluated_at: now.toISOString(),
    expires_at: input.credential.payload.expires_at,
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
  });
  const { payloadHash, signature } = signReceiptPayload(payload, input.receiptSigningKey.privateKeyJwk);
  const receipt: DecisionReceiptRecord = {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: payload.consent_receipt_id,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: payload.wallet_binding_ref,
    decision_result: payload.decision_result,
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
    payload_hash: payloadHash,
    signature,
    signing_key_id: input.receiptSigningKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: `cred:${input.credential.payload.credential_id}:${input.partnerId}:${input.requestId}`,
    created_at: now.toISOString(),
  };

  const presentation = composeHolderPolicyScopedPresentation({
    signedRecord: receipt,
    audiencePartnerId: input.partnerId,
  });

  return {
    ok: true,
    receipt,
    presentation,
    policy_evaluation: { approved: true, reason_codes: evaluation.reason_codes },
    idv_repeated: false,
    decision_context: decisionContext,
  };
}
