// FILE: lib/partner/trustExecution/executeTrustExecutionAuthoritative.ts

import { randomUUID } from "node:crypto";
import { deriveEvidenceIntegrityVerdict } from "@/lib/decisionReceipts/evidenceIntegrityContract";
import { buildCanonicalPayload, normalizeDecisionReceiptTimestamp } from "@/lib/decisionReceipts/canonical";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  ensureSovereignReceiptEvidenceDependencies,
  loadSovereignEvidenceIntegrityGraphForTrustExecution,
} from "@/lib/persistence/boundary/verticalSlice/claimEvidenceRead";
import type { ConsumedTrustAuthorization } from "./trustExecutionTypes";
import { finalizeTrustExecutionOutcome } from "./finalizeTrustExecutionOutcome";
import { buildAuthoritativeVerificationMaterial } from "./buildTrustExecutionVerificationMaterial";
import { loadTrustExecutionOutcomeReceipt } from "./loadTrustExecutionOutcomeReceipt";

const GRAPH_DENY = new Set([
  "tenant_mismatch",
  "policy_binding_mismatch",
  "source_evidence_inconsistent",
  "source_evidence_missing",
  "source_evidence_revoked",
  "source_evidence_expired",
  "claim_missing",
  "claim_revoked",
  "claim_expired",
  "validity_store_unavailable",
]);

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

function graphFailure(input: {
  reasons: string[];
}): { ok: false; code: string; decision_result: "denied" | "indeterminate" } {
  const code = input.reasons.join(",") || "authoritative_evidence_not_permit";
  const denied = input.reasons.some((r) => GRAPH_DENY.has(r));
  return {
    ok: false,
    code,
    decision_result: denied ? "denied" : "indeterminate",
  };
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
  if (input.partnerId !== input.auth.partner_id) {
    return { ok: false, code: "tenant_mismatch", decision_result: "denied" };
  }

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

  const existingReceipt = await loadTrustExecutionOutcomeReceipt({
    authorizationRef: input.auth.wallet_binding_ref,
    partnerId: input.partnerId,
    applicationId: input.auth.application_id,
    challengeId: input.auth.challenge_id,
    policyId: input.auth.policy_id,
    policyVersion: input.auth.policy_version,
    subjectPseudonymId: input.auth.subject_pseudonym_id,
  });
  if (existingReceipt) {
    const materialBuilt = await buildAuthoritativeVerificationMaterial({
      record: existingReceipt,
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
    return {
      ok: true,
      receipt: existingReceipt,
      verification_material: materialBuilt.material,
      outcome_created: false,
    };
  }

  const evidenceGraph = await loadSovereignEvidenceIntegrityGraphForTrustExecution(
    {
      partnerId: input.auth.partner_id,
      applicationId: input.auth.application_id,
      policyId: input.auth.policy_id,
      policyVersion: input.auth.policy_version,
      subjectPseudonymId: input.auth.subject_pseudonym_id,
    },
    input.env,
  );

  if (!evidenceGraph.store_available) {
    return { ok: false, code: "validity_store_unavailable", decision_result: "indeterminate" };
  }
  if (!evidenceGraph.binding_found) {
    return graphFailure({ reasons: ["authoritative_evidence_binding_missing"] });
  }
  if (evidenceGraph.reasons.some((r) => GRAPH_DENY.has(r))) {
    return graphFailure({ reasons: evidenceGraph.reasons });
  }

  const evidenceVerdict = deriveEvidenceIntegrityVerdict({
    receipt_id: `pending_${input.auth.challenge_id}`,
    subject_pseudonym_id: input.auth.subject_pseudonym_id,
    expected_subject_pseudonym_id: input.auth.subject_pseudonym_id,
    partner_id: input.auth.partner_id,
    policy_id: input.auth.policy_id,
    source: evidenceGraph.source,
    claims: evidenceGraph.claims,
    store_available: evidenceGraph.store_available,
  });

  if (evidenceVerdict.verdict !== "accepted") {
    return {
      ok: false,
      code: evidenceVerdict.reasons.join(",") || "authoritative_evidence_not_permit",
      decision_result: evidenceVerdict.verdict === "denied" ? "denied" : "indeterminate",
    };
  }

  const receiptId = `dr_trust_exec_${input.auth.challenge_id.slice(-16)}`;
  const decisionId = randomUUID();
  const evaluatedAt = normalizeDecisionReceiptTimestamp(new Date().toISOString());
  const evaluatedClaimRefs = evidenceGraph.evaluated_claim_refs.map((ref) => ({
    ...ref,
    issued_at: evaluatedAt,
    expires_at: ref.expires_at ? normalizeDecisionReceiptTimestamp(ref.expires_at) : null,
  }));
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
    evaluated_claim_refs: evaluatedClaimRefs,
    issuer_refs: evidenceGraph.issuer_refs,
    decision_context: "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: normalizeDecisionReceiptTimestamp(new Date(Date.now() + 86400_000).toISOString()),
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
    evaluated_claim_refs: evaluatedClaimRefs,
    issuer_refs: evidenceGraph.issuer_refs,
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

  if (evidenceGraph.source?.source_credential_id) {
    const dep = await ensureSovereignReceiptEvidenceDependencies({
      receiptId: finalized.receipt_id,
      sourceCredentialId: evidenceGraph.source.source_credential_id,
      env: input.env,
    });
    if (!dep.ok) {
      return { ok: false, code: dep.code, decision_result: "indeterminate" };
    }
  }

  const committedReceipt = await loadTrustExecutionOutcomeReceipt({
    authorizationRef: input.auth.wallet_binding_ref,
    partnerId: input.partnerId,
    applicationId: input.auth.application_id,
    challengeId: input.auth.challenge_id,
    policyId: input.auth.policy_id,
    policyVersion: input.auth.policy_version,
    subjectPseudonymId: input.auth.subject_pseudonym_id,
  });
  if (!committedReceipt) {
    return { ok: false, code: "committed_receipt_missing", decision_result: "indeterminate" };
  }

  const materialBuilt = await buildAuthoritativeVerificationMaterial({
    record: committedReceipt,
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

  return {
    ok: true,
    receipt: committedReceipt,
    verification_material: materialBuilt.material,
    outcome_created: finalized.created,
  };
}
