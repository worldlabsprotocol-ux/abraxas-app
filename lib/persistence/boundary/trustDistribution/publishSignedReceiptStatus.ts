// FILE: lib/persistence/boundary/trustDistribution/publishSignedReceiptStatus.ts
// Signed status evidence from sovereign authoritative state — distinct from receipt issuance.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatementForTests,
  type ReceiptStatusStatementPayload,
  type SignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import type { SovereignCurrentValidityResult } from "../sovereignCurrentValidity/evaluate";
import { querySovereignStagingPg } from "../sovereignStagingPg";

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

async function nextStatusVersion(
  receiptId: string,
  env: Record<string, string | undefined>,
): Promise<number | { error: string }> {
  const bump = await querySovereignStagingPg<{ status_version: number }>(
    `insert into public.sovereign_receipt_status_checkpoints (receipt_id, status_version)
     values ($1, 1)
     on conflict (receipt_id) do update
       set status_version = public.sovereign_receipt_status_checkpoints.status_version + 1
     returning status_version`,
    [receiptId],
    env,
  );
  if ("error" in bump) return { error: bump.error };
  return bump.rows[0]?.status_version ?? 1;
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

  const version = await nextStatusVersion(input.record.id, env);
  if (typeof version !== "number") return { ok: false, reason: version.error };

  const stored = resolveReceiptStatus(input.record);
  const issuedAt = new Date();
  const ttl = input.statementTtlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(issuedAt.getTime() + ttl * 1000);
  const supersedes = version > 1 ? version - 1 : null;

  const payload: ReceiptStatusStatementPayload = {
    document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
    schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
    receipt_id: input.record.id,
    status_reference: input.record.id,
    partner_id: input.record.partner_id,
    policy_id: input.record.policy_id,
    policy_version: input.record.policy_version,
    environment: input.signedIssuerAuthorityEnvironment,
    status_version: version,
    supersedes_status_version: supersedes,
    receipt_status: stored === "revoked" ? "revoked" : stored === "expired" ? "expired" : "active",
    superseded: input.evaluation.superseded,
    partner_operational: !input.evaluation.invalidation_reasons.includes("partner_inactive"),
    policy_active: !input.evaluation.invalidation_reasons.includes("policy_no_longer_valid"),
    claims_current: input.evaluation.claims_current,
    evidence_current: input.evaluation.evidence_current,
    effective_at: input.evaluation.checked_at,
    issued_at: issuedAt.toISOString(),
    statement_expires_at: expiresAt.toISOString(),
    status_signer_key_id: statusSignerKeyId(env),
  };

  return signReceiptStatusStatementForTests({
    payload,
    statusSignerPrivateJwk: privateJwk,
  });
}
