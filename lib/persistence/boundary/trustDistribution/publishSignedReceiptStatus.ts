// FILE: lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus.ts
// Signed status evidence from sovereign authoritative state — distinct from receipt issuance.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import { isReceiptPendingEvidenceFinalization } from "@/lib/decisionReceipts/issuanceFinalization";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatementForTests,
  type ReceiptStatusStatementPayload,
  type SignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import type { SovereignCurrentValidityResult } from "../sovereignCurrentValidity/evaluate";
import { nextSignedStatusVersion } from "./statusVersionCheckpoint";

const DEFAULT_TTL_SECONDS = 300;

function loadStatusSignerPrivateJwk(env: Record<string, string | undefined>): JsonWebKey | null {
  const raw = env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JsonWebKey;
  } catch {
    return null;
  }
}

function statusSignerKeyId(env: Record<string, string | undefined>): string {
  return env.ABRAXAS_STATUS_SIGNER_KEY_ID?.trim() ?? "abraxas-status-signer";
}

export function receiptStatusPayloadFromEvaluation(input: {
  record: DecisionReceiptRecord;
  evaluation: Pick<
    SovereignCurrentValidityResult,
    | "lifecycle_status"
    | "superseded"
    | "invalidation_reasons"
    | "claims_current"
    | "evidence_current"
    | "checked_at"
  >;
  signedIssuerAuthorityEnvironment: "demo" | "production";
  statusVersion: number;
  statusSignerKeyId: string;
  issuedAt: Date;
  statementTtlSeconds?: number;
}): ReceiptStatusStatementPayload {
  const stored = resolveReceiptStatus(input.record);
  const ttl = input.statementTtlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(input.issuedAt.getTime() + ttl * 1000);
  return {
    document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
    schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
    receipt_id: input.record.id,
    status_reference: input.record.id,
    partner_id: input.record.partner_id,
    policy_id: input.record.policy_id,
    policy_version: input.record.policy_version,
    environment: input.signedIssuerAuthorityEnvironment,
    status_version: input.statusVersion,
    supersedes_status_version: input.statusVersion > 1 ? input.statusVersion - 1 : null,
    receipt_status: input.evaluation.lifecycle_status === "revoked" || stored === "revoked"
      ? "revoked"
      : input.evaluation.lifecycle_status === "expired" || stored === "expired"
        ? "expired"
        : "active",
    superseded: input.evaluation.superseded,
    partner_operational: !input.evaluation.invalidation_reasons.includes("partner_inactive"),
    policy_active: !input.evaluation.invalidation_reasons.includes("policy_no_longer_valid"),
    claims_current: input.evaluation.claims_current,
    evidence_current: input.evaluation.evidence_current,
    effective_at: input.evaluation.checked_at,
    issued_at: input.issuedAt.toISOString(),
    statement_expires_at: expiresAt.toISOString(),
    status_signer_key_id: input.statusSignerKeyId,
  };
}

export async function publishSignedReceiptStatusFromSovereignEvaluation(input: {
  record: DecisionReceiptRecord;
  evaluation: SovereignCurrentValidityResult;
  signedIssuerAuthorityEnvironment: "demo" | "production";
  statementTtlSeconds?: number;
  env?: Record<string, string | undefined>;
}): Promise<SignedReceiptStatusStatement | { ok: false; reason: string }> {
  const env = input.env ?? process.env;
  if (!input.evaluation.store_available) {
    return { ok: false, reason: "authoritative_validity_store_unavailable" };
  }
  const privateJwk = loadStatusSignerPrivateJwk(env);
  if (!privateJwk) return { ok: false, reason: "status_signer_private_jwk_missing" };

  if (input.evaluation.lifecycle_status === "invalidated") {
    return { ok: false, reason: "authoritative_validity_indeterminate" };
  }
  if (isReceiptPendingEvidenceFinalization(input.record)) {
    return { ok: false, reason: "issuance_not_finalized" };
  }

  const version = await nextSignedStatusVersion({
    receiptId: input.record.id,
    env,
  });
  if (typeof version !== "number") return { ok: false, reason: version.error };
  const payload = receiptStatusPayloadFromEvaluation({
    record: input.record,
    evaluation: input.evaluation,
    signedIssuerAuthorityEnvironment: input.signedIssuerAuthorityEnvironment,
    statusVersion: version,
    statusSignerKeyId: statusSignerKeyId(env),
    issuedAt: new Date(),
    statementTtlSeconds: input.statementTtlSeconds,
  });

  return signReceiptStatusStatementForTests({
    payload,
    statusSignerPrivateJwk: privateJwk,
  });
}
