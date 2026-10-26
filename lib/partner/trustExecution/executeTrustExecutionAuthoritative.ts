// FILE: lib/partner/trustExecution/executeTrustExecutionAuthoritative.ts

import { randomUUID } from "node:crypto";
import { deriveEvidenceIntegrityVerdict } from "@/lib/decisionReceipts/evidenceIntegrityContract";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluateClaimEvidenceOnSovereignPg } from "@/lib/persistence/boundary/verticalSlice/claimEvidenceRead";
import type { ConsumedTrustAuthorization } from "./trustExecutionTypes";
import { finalizeTrustExecutionOutcome } from "./finalizeTrustExecutionOutcome";
import { buildAuthoritativeVerificationMaterial } from "./buildTrustExecutionVerificationMaterial";

function readAnchorMaterial(env: Record<string, string | undefined>):
  | { ok: true; anchorKeyId: string; anchorPublicJwk: JsonWebKey; anchorPrivateJwk: JsonWebKey }
  | { ok: false; code: string } {
  const anchorKeyId = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID?.trim();
  const pubRaw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK?.trim();
  const privRaw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK?.trim();
  if (!anchorKeyId || !pubRaw || !privRaw) {
    return { ok: false, code: "authoritative_trust_anchor_unavailable" };
  }
  try {
    return {
      ok: true,
      anchorKeyId,
      anchorPublicJwk: JSON.parse(pubRaw) as JsonWebKey,
      anchorPrivateJwk: JSON.parse(privRaw) as JsonWebKey,
    };
  } catch {
    return { ok: false, code: "authoritative_trust_anchor_invalid" };
  }
}

export async function executeTrustExecutionAuthoritativeDecision(input: {
  auth: ConsumedTrustAuthorization;
  partnerId: string;
  env: Record<string, string | undefined>;
}): Promise<
  | {
      ok: true;
      receipt: DecisionReceiptRecord;
      verification_material: import("./trustExecutionTypes").TrustExecutionVerificationMaterial;
      outcome_created: boolean;
    }
  | { ok: false; code: string; decision_result?: "denied" | "indeterminate" }
> {
  const signingKey = resolveIssuanceSigningKey({
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    env: input.env,
  });
  if (!signingKey.ok) {
    return { ok: false, code: "authoritative_signing_unavailable", decision_result: "indeterminate" };
  }

  const anchor = readAnchorMaterial(input.env);
  if (!anchor.ok) {
    return { ok: false, code: anchor.code, decision_result: "indeterminate" };
  }

  const receiptId = `dr_trust_exec_${input.auth.challenge_id.slice(-16)}`;
  const decisionId = randomUUID();
  const evaluatedAt = new Date().toISOString();
  const draftRecord: DecisionReceiptRecord = {
    id: receiptId,
    verification_decision_id: decisionId,
    consent_receipt_id: null,
    partner_id: input.auth.partner_id,
    policy_id: input.auth.policy_id,
    policy_version: input.auth.policy_version,
    subject_pseudonym_id: input.auth.subject_pseudonym_id,
    wallet_binding_ref: input.auth.wallet_binding_ref,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
    revoked_at: null,
    status: "active",
    issuance_finalized_at: evaluatedAt,
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
    payload_hash: "",
    signature: "",
    signing_key_id: signingKey.key_id,
    anchor_reference: null,
    idempotency_key: input.auth.correlation_id,
    created_at: evaluatedAt,
  };

  const claimEvidence = await evaluateClaimEvidenceOnSovereignPg(draftRecord, input.env);
  if (!claimEvidence.store_available) {
    return { ok: false, code: "validity_store_unavailable", decision_result: "indeterminate" };
  }

  const evidenceVerdict = deriveEvidenceIntegrityVerdict({
    receipt_id: draftRecord.id,
    subject_pseudonym_id: draftRecord.subject_pseudonym_id,
    expected_subject_pseudonym_id: draftRecord.subject_pseudonym_id,
    partner_id: draftRecord.partner_id,
    policy_id: draftRecord.policy_id,
    source: null,
    claims: [],
    store_available: claimEvidence.store_available,
  });

  if (evidenceVerdict.verdict !== "accepted") {
    return {
      ok: false,
      code: evidenceVerdict.reasons.join(",") || "authoritative_evidence_not_permit",
      decision_result: evidenceVerdict.verdict === "denied" ? "denied" : "indeterminate",
    };
  }

  if (!claimEvidence.claims_current || !claimEvidence.evidence_current) {
    return {
      ok: false,
      code: claimEvidence.reasons.join(",") || "authoritative_evidence_stale",
      decision_result: "indeterminate",
    };
  }

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
    reason_codes: ["trust_execution_live_authoritative_evidence"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: draftRecord.expires_at,
  });
  const { payloadHash, signature } = signReceiptPayload(payload, signingKey.privateKeyJwk);
  const record: DecisionReceiptRecord = {
    ...draftRecord,
    reason_codes: payload.reason_codes,
    payload_hash: payloadHash,
    signature,
  };

  const materialBuilt = await buildAuthoritativeVerificationMaterial({
    record,
    applicationId: input.auth.application_id,
    env: input.env,
    anchorPublicJwk: anchor.anchorPublicJwk,
    anchorPrivateJwk: anchor.anchorPrivateJwk,
    anchorKeyId: anchor.anchorKeyId,
    registryVersion: 854,
  });
  if (!materialBuilt.ok) {
    return { ok: false, code: materialBuilt.code, decision_result: "indeterminate" };
  }

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

  return {
    ok: true,
    receipt: record,
    verification_material: materialBuilt.material,
    outcome_created: finalized.created,
  };
}
