// Trusted application workflow over the existing continuity table and validity evaluation.
// The KMS adapter does not decide authority. This module reads recorded rows and the sovereign store.
// Governance verification is separate from the issuer signature. See GOVERNANCE_PIN_CUSTODY.

import { issuerAuthorityStateDigest, verifySignedIssuerAuthorityStatement } from "@abraxas/independent-verifier";
import type { SignedIssuerAuthorityStatement } from "@abraxas/independent-verifier";
import { normalizeDecisionReceiptTimestamp } from "@/lib/decisionReceipts/canonical";
import { isReceiptPendingEvidenceFinalization } from "@/lib/decisionReceipts/issuanceFinalization";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  buildIssuerAuthorityStatementFromRegistry,
  loadIssuerAuthorityState,
} from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  applyIssuerAuthorityChangeAuthorization,
  describeConfiguredIssuerAuthority,
  readConfiguredIssuerAnchor,
  readCurrentIssuerAuthorityRow,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import {
  assertIndependentGovernancePin,
  classifyGovernanceAction,
  governanceApprovalMatchesTransition,
  verifyAuthorityGovernanceApproval,
  type AuthorityGovernanceApproval,
} from "@/lib/persistence/boundary/issuerAuthority/governanceApproval";
import { readEstablishedGovernancePin } from "@/lib/persistence/boundary/issuerAuthority/governanceTrustPin";
import { evaluateSovereignCurrentValidity } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import { receiptStatusPayloadFromEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import { nextSignedStatusVersion } from "@/lib/persistence/boundary/trustDistribution/statusVersionCheckpoint";
import type { IssuerAnchorSigner, StatusStatementSigner } from "./institutionalSigner";
import type { IssuerAuthorityStatementPayload } from "@abraxas/independent-verifier";

export {
  GOVERNANCE_APPROVAL_DOCUMENT,
  GOVERNANCE_PIN_CUSTODY,
  type AuthorityGovernanceApproval,
} from "@/lib/persistence/boundary/issuerAuthority/governanceApproval";

export async function signRecordedIssuerAuthorityStatement(input: {
  env: Record<string, string | undefined>;
  issuer: IssuerAnchorSigner;
  anchorKeyId: string;
  issuedAt: string;
}) {
  const recorded = await readCurrentIssuerAuthorityRow({
    env: input.env,
    environment: input.issuer.environment,
  });
  if (!recorded.ok) return recorded;
  if (!recorded.row) return { ok: false as const, reason: "authority_bootstrap_required" };
  const built = buildIssuerAuthorityStatementFromRegistry({
    registryVersion: recorded.row.registryVersion,
    supersedesRegistryVersion: recorded.row.supersedesRegistryVersion,
    anchorKeyId: input.anchorKeyId,
    issuedAt: input.issuedAt,
    env: input.env,
  });
  if (!built.ok) return built;
  if (issuerAuthorityStateDigest(built.payload) !== recorded.row.authorityStateDigest) {
    return { ok: false as const, reason: "recorded_authority_mismatch" };
  }
  return input.issuer.signIssuerAuthorityStatement(built.payload);
}

export async function approveRecordedAuthorityChange(input: {
  env: Record<string, string | undefined>;
  issuer: IssuerAnchorSigner;
  proposed: IssuerAuthorityStatementPayload;
  assertedAuthorityStateDigest: string;
  governanceApproval?: AuthorityGovernanceApproval | null;
  governanceSignatureBase64Url?: string | null;
}) {
  const described = describeConfiguredIssuerAuthority({
    env: input.env,
    anchorKeyId: input.proposed.anchor_key_id,
  });
  if (!described.ok) return described;
  if (
    input.assertedAuthorityStateDigest !== described.authorityStateDigest
    || issuerAuthorityStateDigest(input.proposed) !== described.authorityStateDigest
  ) {
    return { ok: false as const, reason: "unapproved_authority_state" };
  }
  if (!input.governanceApproval || !input.governanceSignatureBase64Url) {
    return { ok: false as const, reason: "independent_governance_approval_required" };
  }
  const trusted = readEstablishedGovernancePin(described.environment);
  if (!trusted.ok) return trusted;
  const anchor = readConfiguredIssuerAnchor(input.env);
  if (!anchor.ok) return anchor;
  const state = loadIssuerAuthorityState(input.env);
  if (!state.ok) return state;
  const independent = assertIndependentGovernancePin({
    pin: trusted.pin,
    anchorKeyId: anchor.anchorKeyId,
    anchorPublicJwk: anchor.anchorPublicJwk,
    authorityKeys: state.keys,
    statusSigners: state.statusSigners,
  });
  if (!independent.ok) return independent;
  const verified = verifyAuthorityGovernanceApproval({
    approval: input.governanceApproval,
    signatureBase64Url: input.governanceSignatureBase64Url,
    pin: trusted.pin,
  });
  if (!verified.ok) return verified;
  const recorded = await readCurrentIssuerAuthorityRow({
    env: input.env,
    environment: described.environment,
  });
  if (!recorded.ok) return recorded;
  const action = classifyGovernanceAction({
    change: recorded.row ? "authority_change" : "bootstrap",
    statuses: [...state.keys, ...state.statusSigners].map((key) => key.status),
  });
  const bound = governanceApprovalMatchesTransition({
    approval: input.governanceApproval,
    environment: described.environment,
    action,
    authorityStateDigest: described.authorityStateDigest,
    registryVersion: input.proposed.registry_version,
    supersedesRegistryVersion: input.proposed.supersedes_registry_version,
    recordedVersion: recorded.row?.registryVersion ?? null,
    recordedDigest: recorded.row?.authorityStateDigest ?? null,
  });
  if (!bound.ok) return bound;
  const signed = await input.issuer.signAuthorityChangeApproval({
    retained: recorded.row
      ? {
          registryVersion: recorded.row.registryVersion,
          authorityStateDigest: recorded.row.authorityStateDigest,
        }
      : null,
    proposed: input.proposed,
    assertedAuthorityStateDigest: described.authorityStateDigest,
  });
  if (!signed.ok) return signed;
  return applyIssuerAuthorityChangeAuthorization({
    env: input.env,
    authorization: signed.authorization,
    signatureBase64Url: signed.signature,
    governanceApproval: input.governanceApproval,
    governanceSignatureBase64Url: input.governanceSignatureBase64Url,
  });
}

function isoTimestamp(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return normalizeDecisionReceiptTimestamp(value);
}

async function loadRecordedDecisionReceipt(input: {
  env: Record<string, string | undefined>;
  receiptId: string;
}): Promise<
  | { ok: true; record: DecisionReceiptRecord }
  | { ok: false; reason: "recorded_receipt_missing" | "recorded_receipt_unavailable" }
> {
  const loaded = await querySovereignStagingPg<{
    id: string;
    verification_decision_id: string;
    consent_receipt_id: string | null;
    partner_id: string;
    policy_id: string;
    policy_version: number;
    subject_pseudonym_id: string;
    wallet_binding_ref: string | null;
    decision_result: DecisionReceiptRecord["decision_result"];
    reason_codes: string[] | null;
    evaluated_claim_refs: DecisionReceiptRecord["evaluated_claim_refs"] | null;
    issuer_refs: string[] | null;
    decision_context: DecisionReceiptRecord["decision_context"];
    evaluated_at: Date | string;
    expires_at: Date | string | null;
    revoked_at: Date | string | null;
    status: DecisionReceiptRecord["status"];
    issuance_finalized_at: Date | string | null;
    schema_version: string;
    payload_hash: string;
    signature: string;
    signing_key_id: string;
    anchor_reference: string | null;
    idempotency_key: string | null;
    created_at: Date | string;
  }>(
    `select id, verification_decision_id, consent_receipt_id, partner_id, policy_id, policy_version,
            subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes, evaluated_claim_refs,
            issuer_refs, decision_context, evaluated_at, expires_at, revoked_at, status,
            issuance_finalized_at, schema_version, payload_hash, signature, signing_key_id,
            anchor_reference, idempotency_key, created_at
       from public.decision_receipts
      where id = $1
      limit 1`,
    [input.receiptId],
    input.env,
  );
  if ("error" in loaded) return { ok: false, reason: "recorded_receipt_unavailable" };
  const row = loaded.rows[0];
  if (!row) return { ok: false, reason: "recorded_receipt_missing" };
  return {
    ok: true,
    record: mapReceiptRow({
      ...row,
      evaluated_at: isoTimestamp(row.evaluated_at),
      expires_at: isoTimestamp(row.expires_at),
      revoked_at: isoTimestamp(row.revoked_at),
      issuance_finalized_at: isoTimestamp(row.issuance_finalized_at),
      created_at: isoTimestamp(row.created_at),
    }),
  };
}

export async function publishAuthoritativeReceiptStatus(input: {
  env: Record<string, string | undefined>;
  status: StatusStatementSigner;
  statusSignerKeyId: string;
  receiptId: string;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  statementTtlSeconds?: number;
}) {
  const anchor = readConfiguredIssuerAnchor(input.env);
  if (!anchor.ok) return anchor;
  const recorded = await readCurrentIssuerAuthorityRow({
    env: input.env,
    environment: input.status.environment,
  });
  if (!recorded.ok) return recorded;
  if (!recorded.row) return { ok: false as const, reason: "authority_bootstrap_required" };
  const statementMatchesRecord = verifySignedIssuerAuthorityStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: anchor.anchorPublicJwk,
    acceptedRegistryVersion: recorded.row.registryVersion,
    expectedAuthorityStateDigest: recorded.row.authorityStateDigest,
  });
  if (
    !statementMatchesRecord.ok
    || input.signedIssuerAuthority.payload.environment !== input.status.environment
    || issuerAuthorityStateDigest(input.signedIssuerAuthority.payload) !== recorded.row.authorityStateDigest
  ) {
    return { ok: false as const, reason: "recorded_authority_mismatch" };
  }
  const loaded = await loadRecordedDecisionReceipt({ env: input.env, receiptId: input.receiptId });
  if (!loaded.ok) return loaded;
  const now = new Date();
  const evaluation = await evaluateSovereignCurrentValidity({
    record: loaded.record,
    signedIssuerAuthority: input.signedIssuerAuthority,
    trustAnchorPublicJwk: anchor.anchorPublicJwk,
    acceptedRegistryVersion: recorded.row.registryVersion,
    expectedAuthorityStateDigest: recorded.row.authorityStateDigest,
    expectedPartnerId: loaded.record.partner_id,
    expectedPolicyId: loaded.record.policy_id,
    expectedEnvironment: input.status.environment,
    now,
    env: input.env,
  });
  if (!evaluation.store_available) {
    return { ok: false as const, reason: "authoritative_validity_store_unavailable" };
  }
  if (evaluation.lifecycle_status === "invalidated") {
    return { ok: false as const, reason: "authoritative_validity_indeterminate" };
  }
  if (isReceiptPendingEvidenceFinalization(loaded.record)) {
    return { ok: false as const, reason: "issuance_not_finalized" };
  }
  const version = await nextSignedStatusVersion({ receiptId: loaded.record.id, env: input.env });
  if (typeof version !== "number") return { ok: false as const, reason: version.error };
  const payload = receiptStatusPayloadFromEvaluation({
    record: loaded.record,
    evaluation,
    signedIssuerAuthorityEnvironment: input.status.environment,
    statusVersion: version,
    statusSignerKeyId: input.statusSignerKeyId,
    issuedAt: now,
    statementTtlSeconds: input.statementTtlSeconds,
  });
  return input.status.signReceiptStatusStatement(payload);
}
