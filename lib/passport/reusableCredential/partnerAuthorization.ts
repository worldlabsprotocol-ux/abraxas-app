// FILE: lib/passport/reusableCredential/partnerAuthorization.ts
// Derive partner-bound authorization receipts from a verified reusable credential (no repeat IDV).

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
import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import {
  composeHolderPolicyScopedPresentation,
  type HolderPolicyScopedPresentation,
} from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import type { SignedPassportReusableCredential } from "./contract";
import { verifyPassportReusableCredential } from "./verify";

export type PartnerAuthorizationFromCredentialInput = {
  credential: SignedPassportReusableCredential;
  holderSubjectId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyRules: PartnerPolicyRules;
  requestId: string;
  signingKey: ReceiptSigningKeyPair;
  trustedCredentialIssuerIds: string[];
  portableRevocationSnapshot: import("@/lib/protocol/portableRevocation").PortableRevocationSignedArtifact;
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
    }
  | {
      ok: false;
      code: string;
      policy_evaluation?: { approved: false; missing_claims: string[] };
    };

const consumedRequestIds = new Set<string>();

function claimsFromCredential(credential: SignedPassportReusableCredential): CredentialClaimRecord[] {
  return credential.payload.asserted_claims.map((row) => ({
    id: row.claim_id,
    subject_id: credential.payload.holder_subject_id,
    credential_jti: credential.payload.credential_id,
    claim_type: row.claim_type as CredentialClaimRecord["claim_type"],
    claim_value:
      row.claim_type === "product_eligibility"
        ? { outcome: PRODUCT_ELIGIBILITY_OVER_21 }
        : { ref: row.claim_value_ref },
    issuer_id: row.issuer_id,
    assurance_level: row.assurance_level,
    issued_at: row.issued_at,
    expires_at: row.expires_at,
    status: row.status === "active" ? "active" : "revoked",
    revocation_reference: null,
    evidence_reference: row.claim_value_ref,
    jurisdiction: null,
    policy_scope: "compliance",
  }));
}

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

export async function authorizePartnerFromReusableCredential(
  input: PartnerAuthorizationFromCredentialInput,
): Promise<PartnerAuthorizationFromCredentialResult> {
  if (consumedRequestIds.has(input.requestId)) {
    return { ok: false, code: "replay_request_id" };
  }

  const verified = verifyPassportReusableCredential({
    credential: input.credential,
    issuerPublicKeyJwk: input.signingKey.publicKeyJwk,
    trustedIssuerIds: input.trustedCredentialIssuerIds,
    holderSubjectId: input.holderSubjectId,
    now: input.now,
    portableRevocationSnapshot: input.portableRevocationSnapshot,
  });
  if (!verified.ok) {
    return { ok: false, code: verified.code };
  }

  const claims = claimsFromCredential(input.credential);
  const evaluation = evaluatePolicyRules(input.policyRules, claims, {
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

  const now = input.now ?? new Date();
  const receiptId = `dr_${randomBytes(10).toString("base64url")}`;
  const decisionId = randomBytes(16).toString("hex");
  const evaluatedRefs = toEvaluatedClaimRefs(claims);
  const payload = buildCanonicalPayload({
    receipt_id: receiptId,
    decision_id: decisionId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    partner_id: input.partnerId,
    subject_pseudonym_id: subjectPseudonymId(`${input.holderSubjectId}:${input.partnerId}`),
    wallet_binding_ref: input.credential.payload.holder_possession_ref,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: evaluation.reason_codes,
    evaluated_claim_refs: evaluatedRefs,
    issuer_refs: [input.credential.payload.issuer_id, CLAIM_ISSUERS.abraxas],
    decision_context: input.policyRules.sandbox_only ? "sandbox_only" : "production",
    evaluated_at: now.toISOString(),
    expires_at: input.credential.payload.expires_at,
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
  });
  const { payloadHash, signature } = signReceiptPayload(payload, input.signingKey.privateKeyJwk);
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
    signing_key_id: input.signingKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: `cred:${input.credential.payload.credential_id}:${input.partnerId}:${input.requestId}`,
    created_at: now.toISOString(),
  };

  const presentation = composeHolderPolicyScopedPresentation({
    signedRecord: receipt,
    audiencePartnerId: input.partnerId,
  });

  consumedRequestIds.add(input.requestId);

  return {
    ok: true,
    receipt,
    presentation,
    policy_evaluation: { approved: true, reason_codes: evaluation.reason_codes },
    idv_repeated: false,
  };
}

/** Test helper — reset replay ledger between cases. */
export function resetPartnerAuthorizationReplayLedgerForTests(): void {
  consumedRequestIds.clear();
}
