// FILE: lib/partner/trustExecution/partnerTrustExecutionService.ts

import { randomBytes, randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { buildWalletScopedTrustExecutionMessage } from "@/lib/auth/walletAuthorization/scopedExecutionEnvelope";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import {
  consumeScopedTrustChallengeAtomic,
  insertScopedTrustChallenge,
  loadScopedTrustChallenge,
} from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { querySovereignStagingPg } from "@/lib/persistence/boundary/sovereignStagingPg";
import {
  PARTNER_TRUST_EXECUTION_ACTION,
  PARTNER_TRUST_EXECUTION_AUDIENCE,
  PARTNER_TRUST_EXECUTION_CHALLENGE_TTL_MS,
  PARTNER_TRUST_EXECUTION_RESOURCE_PREFIX,
} from "./constants";

export type PartnerApplicationScope = {
  applicationId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  status: string;
};

export async function resolvePartnerApplicationScope(input: {
  partnerId: string;
  applicationId: string;
}): Promise<PartnerApplicationScope | null> {
  const result = await querySovereignStagingPg<{
    id: string;
    partner_id: string;
    policy_id: string;
    policy_version: number;
    status: string;
  }>(
    `select id, partner_id, policy_id, policy_version, status
     from public.partner_launchpad_applications
     where id = $1::uuid and partner_id = $2
     limit 1`,
    [input.applicationId, input.partnerId],
  );
  if ("error" in result) throw new ScopedChallengeStoreUnavailableError(result.error);
  const row = result.rows[0];
  if (!row || row.status !== "active") return null;
  return {
    applicationId: row.id,
    partnerId: row.partner_id,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    status: row.status,
  };
}

export async function issuePartnerTrustExecutionChallenge(input: {
  partnerId: string;
  applicationId: string;
  holderWalletAddress: string;
  origin: string;
  uri: string;
  solanaNetwork: string;
  correlationId?: string;
}): Promise<
  | {
      ok: true;
      challenge_id: string;
      correlation_id: string;
      expires_at: string;
      action: typeof PARTNER_TRUST_EXECUTION_ACTION;
      policy_id: string;
      policy_version: number;
    }
  | { ok: false; code: string }
> {
  const scope = await resolvePartnerApplicationScope({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
  });
  if (!scope) return { ok: false, code: "application_scope_invalid" };

  let wallet: string;
  try {
    wallet = new PublicKey(input.holderWalletAddress.trim()).toBase58();
  } catch {
    return { ok: false, code: "invalid_wallet" };
  }

  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + PARTNER_TRUST_EXECUTION_CHALLENGE_TTL_MS).toISOString();
  const challengeId = `wstc_${randomBytes(16).toString("hex")}`;
  const correlationId = input.correlationId?.trim() || randomUUID();
  const originNormalized = new URL(input.origin).origin;
  const domain = new URL(input.origin).host;

  const binding = {
    domain,
    audience: PARTNER_TRUST_EXECUTION_AUDIENCE,
    walletAddress: wallet,
    uri: input.uri,
    solanaNetwork: input.solanaNetwork,
    nonce: randomBytes(16).toString("hex"),
    issuedAt,
    expiresAt,
    requestId: challengeId,
    origin: originNormalized,
    partnerId: scope.partnerId,
    applicationId: scope.applicationId,
    action: PARTNER_TRUST_EXECUTION_ACTION,
    resource: `${PARTNER_TRUST_EXECUTION_RESOURCE_PREFIX}:${scope.applicationId}`,
    policyId: scope.policyId,
    human: {
      actionTitle: "Authorize trust execution",
      policyId: scope.policyId,
      authorizationSummary: `Authorize ${PARTNER_TRUST_EXECUTION_ACTION} for this partner application.`,
      environment: "Partner flow",
    },
  };

  const message = buildWalletScopedTrustExecutionMessage(binding);
  await insertScopedTrustChallenge({
    binding,
    message,
    policyVersion: scope.policyVersion,
    correlationId,
  });

  return {
    ok: true,
    challenge_id: challengeId,
    correlation_id: correlationId,
    expires_at: expiresAt,
    action: PARTNER_TRUST_EXECUTION_ACTION,
    policy_id: scope.policyId,
    policy_version: scope.policyVersion,
  };
}

export async function getHolderTrustExecutionChallenge(challengeId: string): Promise<
  | {
      ok: true;
      challenge_id: string;
      message: string;
      expires_at: string;
      partner_id: string;
      application_id: string;
      policy_id: string;
      action: string;
      status: "pending" | "consumed" | "expired";
    }
  | { ok: false; code: string }
> {
  const row = await loadScopedTrustChallenge(challengeId);
  if (!row) return { ok: false, code: "not_found" };
  let status: "pending" | "consumed" | "expired" = "pending";
  if (row.consumedAt) status = "consumed";
  else if (new Date(row.expiresAt) <= new Date()) status = "expired";

  return {
    ok: true,
    challenge_id: row.challengeId,
    message: row.message,
    expires_at: row.expiresAt,
    partner_id: row.partnerId,
    application_id: row.applicationId ?? "",
    policy_id: row.policyId,
    action: row.action,
    status,
  };
}

export async function authorizePartnerTrustExecution(input: {
  challengeId: string;
  walletAddress: string;
  signature: string;
  solanaNetwork: string;
}): Promise<
  | { ok: true; authorization_ref: string; correlation_id: string }
  | { ok: false; code: string }
> {
  const row = await loadScopedTrustChallenge(input.challengeId);
  if (!row) return { ok: false, code: "not_found" };
  if (row.consumedAt) return { ok: false, code: "replay" };
  if (new Date(row.expiresAt) <= new Date()) return { ok: false, code: "expired" };

  let wallet: string;
  try {
    wallet = new PublicKey(input.walletAddress.trim()).toBase58();
  } catch {
    return { ok: false, code: "invalid_wallet" };
  }
  if (wallet !== row.walletAddress) return { ok: false, code: "wrong_wallet" };

  const valid = verifyPassportSolanaPersonalMessage({
    message: row.message,
    signature: input.signature,
    walletAddress: wallet,
  });
  if (!valid) return { ok: false, code: "invalid_signature" };

  const consumed = await consumeScopedTrustChallengeAtomic({
    challengeId: input.challengeId,
    message: row.message,
    walletAddress: wallet,
    partnerId: row.partnerId,
    applicationId: row.applicationId ?? "",
    action: row.action,
  });
  if (!consumed.ok) return { ok: false, code: consumed.reason };

  return {
    ok: true,
    authorization_ref: consumed.authorizationRef,
    correlation_id: row.correlationId,
  };
}
