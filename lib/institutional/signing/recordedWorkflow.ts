// Trusted application workflow over the existing continuity table and validity evaluation.
// The KMS adapter does not decide authority. This module reads recorded rows and the sovereign store.
// Independent governance approval is not implemented. See INDEPENDENT_GOVERNANCE_APPROVAL.

import { issuerAuthorityStateDigest, verifySignedIssuerAuthorityStatement } from "@abraxas/independent-verifier";
import type { SignedIssuerAuthorityStatement } from "@abraxas/independent-verifier";
import { normalizeDecisionReceiptTimestamp } from "@/lib/decisionReceipts/canonical";
import { isReceiptPendingEvidenceFinalization } from "@/lib/decisionReceipts/issuanceFinalization";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildIssuerAuthorityStatementFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  describeConfiguredIssuerAuthority,
  INITIAL_ISSUER_REGISTRY_VERSION,
  readConfiguredIssuerAnchor,
  readCurrentIssuerAuthorityRow,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import { evaluateSovereignCurrentValidity } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import { receiptStatusPayloadFromEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import { nextSignedStatusVersion } from "@/lib/persistence/boundary/trustDistribution/statusVersionCheckpoint";
import type { IssuerAnchorSigner, StatusStatementSigner } from "./institutionalSigner";
import type { IssuerAuthorityStatementPayload } from "@abraxas/independent-verifier";

export const GOVERNANCE_APPROVAL_DOCUMENT = "abraxas_authority_governance_approval/1.0.0" as const;

/**
 * A caller may present this binding. Nothing in the current system can authenticate it
 * independently of the issuer signing identity, so a matching binding is still refused.
 */
export type AuthorityGovernanceApproval = {
  document: typeof GOVERNANCE_APPROVAL_DOCUMENT;
  environment: "demo" | "production";
  action: "bootstrap" | "authority_change";
  authority_state_digest: string;
  registry_version: number;
  supersedes_registry_version: number | null;
};

export const INDEPENDENT_GOVERNANCE_APPROVAL = {
  implemented: false,
  inspected: [
    "Institutional mandate: action type is only collateral_release. Verification resolves the signer through the issuer authority statement, so the approver is inside the registry being changed. The controlled fixture is not a live institution.",
    "Wallet authorization: purposes are sign-in, sandbox entry, sandbox verification, and scoped trust execution. None binds an authority-state digest or a registry transition.",
    "Ceremony institutional_approval: the production ceremony records the string not_approved. It is not a signature over one transition.",
    "Configured issuer anchor public JWK: this is the issuer process's own verification key.",
  ],
  missingControl:
    "No existing control, separate from the issuer signing identity, authorizes one specific authority-state transition.",
  smallestMissingMechanism:
    "One Ed25519 approval, checked before the issuer signs, from a public key that is not the issuer anchor and not a key inside the authority state being changed. The signed document binds environment, action, previous registry version, proposed registry version, and authority-state digest. The public key has to be pinned by a party that does not control the issuer signing key. An environment variable in the issuer process is the same class of control as the configured anchor and is not that pin. No new Solana program, DAO, or governance service is required for that signature.",
} as const;

export type GovernanceRefusal =
  | "independent_governance_approval_required"
  | "stale_governance_approval"
  | "independent_governance_approval_unavailable";

/** Always refuses. A structurally matching approval is not an independent decision. */
export function assessIndependentGovernanceApproval(input: {
  approval?: AuthorityGovernanceApproval | null;
  environment: "demo" | "production";
  action: "bootstrap" | "authority_change";
  authorityStateDigest: string;
  registryVersion: number;
  recordedVersion: number | null;
}): { ok: false; reason: GovernanceRefusal } {
  const approval = input.approval ?? null;
  if (!approval) return { ok: false, reason: "independent_governance_approval_required" };
  const previousMatches = input.recordedVersion == null
    ? approval.supersedes_registry_version == null
    : approval.supersedes_registry_version === input.recordedVersion;
  if (!previousMatches) return { ok: false, reason: "stale_governance_approval" };
  const bound = approval.document === GOVERNANCE_APPROVAL_DOCUMENT
    && approval.environment === input.environment
    && approval.action === input.action
    && approval.authority_state_digest === input.authorityStateDigest
    && approval.registry_version === input.registryVersion
    && (input.action === "bootstrap"
      ? input.registryVersion === INITIAL_ISSUER_REGISTRY_VERSION && input.recordedVersion == null
      : input.recordedVersion != null && input.registryVersion === input.recordedVersion + 1);
  if (!bound) return { ok: false, reason: "independent_governance_approval_unavailable" };
  return { ok: false, reason: "independent_governance_approval_unavailable" };
}

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
}) {
  // The issuer is required at the boundary and is not asked to sign. Its signature is not governance approval.
  void input.issuer;
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
  const recorded = await readCurrentIssuerAuthorityRow({
    env: input.env,
    environment: described.environment,
  });
  if (!recorded.ok) return recorded;
  const action = recorded.row ? "authority_change" as const : "bootstrap" as const;
  const governance = assessIndependentGovernanceApproval({
    approval: input.governanceApproval,
    environment: described.environment,
    action,
    authorityStateDigest: described.authorityStateDigest,
    registryVersion: input.proposed.registry_version,
    recordedVersion: recorded.row?.registryVersion ?? null,
  });
  return governance;
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
