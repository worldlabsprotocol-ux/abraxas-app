// Trusted application workflow over the existing continuity table and validity evaluation.
// The KMS adapter does not decide authority. This module reads the recorded row and the evaluation.
// Independent governance approval is not implemented. See INDEPENDENT_GOVERNANCE_APPROVAL.

import { issuerAuthorityStateDigest } from "@abraxas/independent-verifier";
import { buildIssuerAuthorityStatementFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  applyIssuerAuthorityChangeAuthorization,
  describeConfiguredIssuerAuthority,
  readCurrentIssuerAuthorityRow,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import { isReceiptPendingEvidenceFinalization } from "@/lib/decisionReceipts/issuanceFinalization";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { SovereignCurrentValidityResult } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { receiptStatusPayloadFromEvaluation } from "@/lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus";
import { nextSignedStatusVersion } from "@/lib/persistence/boundary/trustDistribution/statusVersionCheckpoint";
import type { IssuerAnchorSigner, StatusStatementSigner } from "./institutionalSigner";
import type { IssuerAuthorityStatementPayload } from "@abraxas/independent-verifier";

export const INDEPENDENT_GOVERNANCE_APPROVAL = {
  implemented: false,
  missingControl:
    "No existing control, separate from the issuer signing identity, authorizes one specific authority-state transition. The production ceremony leaves institutional_approval not_approved. The institutional mandate fixture is not a live governance decision.",
} as const;

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
  const recorded = await readCurrentIssuerAuthorityRow({
    env: input.env,
    environment: described.environment,
  });
  if (!recorded.ok) return recorded;
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
  });
}

export async function publishAuthoritativeReceiptStatus(input: {
  env: Record<string, string | undefined>;
  status: StatusStatementSigner;
  statusSignerKeyId: string;
  record: DecisionReceiptRecord;
  evaluation: SovereignCurrentValidityResult;
  statementTtlSeconds?: number;
  issuedAt?: Date;
}) {
  if (!input.evaluation.store_available) {
    return { ok: false as const, reason: "authoritative_validity_store_unavailable" };
  }
  if (input.evaluation.lifecycle_status === "invalidated") {
    return { ok: false as const, reason: "authoritative_validity_indeterminate" };
  }
  if (isReceiptPendingEvidenceFinalization(input.record)) {
    return { ok: false as const, reason: "issuance_not_finalized" };
  }
  const version = await nextSignedStatusVersion({ receiptId: input.record.id, env: input.env });
  if (typeof version !== "number") return { ok: false as const, reason: version.error };
  const payload = receiptStatusPayloadFromEvaluation({
    record: input.record,
    evaluation: input.evaluation,
    signedIssuerAuthorityEnvironment: input.status.environment,
    statusVersion: version,
    statusSignerKeyId: input.statusSignerKeyId,
    issuedAt: input.issuedAt ?? new Date(),
    statementTtlSeconds: input.statementTtlSeconds,
  });
  return input.status.signReceiptStatusStatement(payload);
}
