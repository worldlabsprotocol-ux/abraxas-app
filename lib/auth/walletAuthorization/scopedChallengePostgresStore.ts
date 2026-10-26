// FILE: lib/auth/walletAuthorization/scopedChallengePostgresStore.ts

import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import type { WalletScopedTrustBinding } from "./scopedExecutionEnvelope";
import {
  hashWalletAuthorizationMessage,
  newAuthorizationEvidenceRef,
  type ScopedChallengeConsumeResult,
} from "./scopedChallengeLifecycle";
import { ScopedChallengeStoreUnavailableError } from "./errors";

export type PersistedScopedTrustChallenge = WalletScopedTrustBinding & {
  challengeId: string;
  messageSha256: string;
  message: string;
  policyVersion: number;
  correlationId: string;
  consumedAt: string | null;
  authorizationRef: string | null;
};

function assertPg<T extends { rows: unknown[] }>(
  result: T | { error: string },
): T {
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  return result;
}

type ChallengeRow = {
  id: string;
  partner_id: string;
  application_id: string;
  policy_id: string;
  policy_version: number;
  action: string;
  resource: string;
  wallet_address: string;
  origin: string;
  audience: string;
  uri: string;
  nonce: string;
  request_id: string;
  correlation_id: string;
  message_sha256: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
  authorization_ref: string | null;
};

function rowToPersisted(row: ChallengeRow): PersistedScopedTrustChallenge {
  let domain = row.origin;
  try {
    domain = new URL(row.origin).host;
  } catch {
    /* keep origin */
  }
  return {
    challengeId: row.id,
    partnerId: row.partner_id,
    applicationId: row.application_id,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    action: row.action,
    resource: row.resource,
    walletAddress: row.wallet_address,
    origin: row.origin,
    audience: row.audience,
    uri: row.uri,
    nonce: row.nonce,
    requestId: row.request_id,
    issuedAt: "",
    expiresAt: row.expires_at,
    domain,
    solanaNetwork: "devnet",
    messageSha256: row.message_sha256,
    message: row.message,
    correlationId: row.correlation_id,
    consumedAt: row.consumed_at,
    authorizationRef: row.authorization_ref,
  };
}

export async function insertScopedTrustChallenge(input: {
  binding: WalletScopedTrustBinding;
  message: string;
  policyVersion: number;
  correlationId: string;
  sessionContextHash?: string | null;
}): Promise<PersistedScopedTrustChallenge> {
  const challengeId = input.binding.requestId;
  const messageSha256 = hashWalletAuthorizationMessage(input.message);
  assertPg(
    await querySovereignStagingPg(
      `insert into public.wallet_scoped_trust_challenges (
        id, partner_id, application_id, policy_id, policy_version, action, resource,
        wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
        message_sha256, message, session_context_hash, expires_at
      ) values (
        $1,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::timestamptz
      )`,
      [
        challengeId,
        input.binding.partnerId,
        input.binding.applicationId,
        input.binding.policyId,
        input.policyVersion,
        input.binding.action,
        input.binding.resource,
        input.binding.walletAddress,
        input.binding.origin,
        input.binding.audience,
        input.binding.uri,
        input.binding.nonce,
        input.binding.requestId,
        input.correlationId,
        messageSha256,
        input.message,
        input.sessionContextHash ?? null,
        input.binding.expiresAt,
      ],
    ),
  );

  return {
    ...input.binding,
    challengeId,
    messageSha256,
    message: input.message,
    policyVersion: input.policyVersion,
    correlationId: input.correlationId,
    consumedAt: null,
    authorizationRef: null,
  };
}

export async function loadScopedTrustChallenge(
  challengeId: string,
): Promise<PersistedScopedTrustChallenge | null> {
  const result = assertPg(
    await querySovereignStagingPg<ChallengeRow>(
      `select * from public.wallet_scoped_trust_challenges where id = $1 limit 1`,
      [challengeId],
    ),
  );
  const row = result.rows[0];
  return row ? rowToPersisted(row) : null;
}

export async function consumeScopedTrustChallengeAtomic(input: {
  challengeId: string;
  message: string;
  walletAddress: string;
  partnerId: string;
  applicationId: string;
  action: string;
}): Promise<ScopedChallengeConsumeResult> {
  const messageSha256 = hashWalletAuthorizationMessage(input.message);
  const existing = await loadScopedTrustChallenge(input.challengeId);
  if (!existing) return { ok: false, reason: "challenge_not_found" };
  if (existing.consumedAt) return { ok: false, reason: "challenge_already_consumed" };
  if (new Date(existing.expiresAt) <= new Date()) return { ok: false, reason: "challenge_expired" };
  if (existing.walletAddress !== input.walletAddress.trim()) {
    return { ok: false, reason: "wallet_mismatch" };
  }
  if (existing.partnerId !== input.partnerId.trim()) return { ok: false, reason: "tenant_mismatch" };
  if (existing.applicationId !== input.applicationId.trim()) {
    return { ok: false, reason: "application_mismatch" };
  }
  if (existing.action !== input.action.trim()) return { ok: false, reason: "action_mismatch" };
  if (existing.messageSha256 !== messageSha256) return { ok: false, reason: "message_hash_mismatch" };

  const rpc = assertPg(
    await querySovereignStagingPg<{ result: Record<string, unknown> }>(
      `select public.abraxas_consume_wallet_scoped_trust_challenge_atomic($1,$2,$3,$4,$5::uuid,$6) as result`,
      [
        input.challengeId,
        input.walletAddress,
        messageSha256,
        input.partnerId,
        input.applicationId,
        input.action,
      ],
    ),
  );
  const payload = rpc.rows[0]?.result;
  if (!payload?.ok) {
    const reloaded = await loadScopedTrustChallenge(input.challengeId);
    if (reloaded?.consumedAt) return { ok: false, reason: "challenge_already_consumed" };
    return { ok: false, reason: "challenge_not_found" };
  }

  return {
    ok: true,
    authorizationRef: String(payload.authorization_ref ?? newAuthorizationEvidenceRef(input.challengeId)),
    binding: existing,
  };
}
