// FILE: lib/auth/ephemeralWallet/actionAuth.ts
// Action-specific wallet signatures (separate from sign-in).

import { PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";
import { canonicalizeSolanaNetwork, resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import { originsMatch, isAllowedPassportWalletOrigin } from "@/lib/auth/passportWalletAuth/origin";
import {
  buildWalletAuthorizationMessage,
  WALLET_AUTH_PURPOSE_SANDBOX_ENTER,
  WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
  type WalletAuthorizationPurpose,
} from "./protocolEnvelope";
import {
  commitEphemeralWalletChallenge,
  hashEphemeralSessionContext,
  peekEphemeralWalletChallenge,
  putEphemeralWalletChallenge,
} from "./challengeStore";
import { EPHEMERAL_WALLET_JWT_AUDIENCE } from "./contract";
import { WALLET_SOL_AUTH_CHALLENGE_TTL_MS } from "./contract";
import { EphemeralStateUnavailableError } from "./errors";
import type { EphemeralWalletChallengeRecord } from "./challengeRecord";

export type WalletActionOperation = "sandbox:enter" | "sandbox:verification:test";

function purposeForOperation(operation: WalletActionOperation): WalletAuthorizationPurpose {
  if (operation === "sandbox:enter") return WALLET_AUTH_PURPOSE_SANDBOX_ENTER;
  return WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY;
}

export function createWalletActionChallengeId(): string {
  return `ewac_${randomBytes(16).toString("hex")}`;
}

export async function issueWalletActionChallenge(input: {
  origin: string;
  uri: string;
  walletAddress: string;
  solanaNetwork: string;
  sessionContext: string;
  operation: WalletActionOperation;
  resource: string;
  policyId?: string | null;
}): Promise<
  | {
      ok: true;
      challenge: { challenge_id: string; message: string; expires_at: string; operation: WalletActionOperation };
    }
  | { ok: false; code: string }
> {
  const authorized = resolveAuthorizedSolanaNetworkFromEnv();
  if (!authorized) return { ok: false, code: "network_config_invalid" };
  const canonicalNetwork = canonicalizeSolanaNetwork(input.solanaNetwork);
  if (!canonicalNetwork || canonicalNetwork !== authorized) return { ok: false, code: "wrong_network" };
  if (!isAllowedPassportWalletOrigin(input.origin)) return { ok: false, code: "wrong_origin" };

  let wallet: string;
  try {
    wallet = new PublicKey(input.walletAddress.trim()).toBase58();
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + WALLET_SOL_AUTH_CHALLENGE_TTL_MS).toISOString();
  const challengeId = createWalletActionChallengeId();
  const domain = new URL(input.origin).host;
  const originNormalized = new URL(input.origin).origin;
  const purpose = purposeForOperation(input.operation);

  const message = buildWalletAuthorizationMessage({
    domain,
    audience: EPHEMERAL_WALLET_JWT_AUDIENCE,
    walletAddress: wallet,
    uri: input.uri,
    solanaNetwork: canonicalNetwork,
    nonce: randomBytes(16).toString("hex"),
    issuedAt,
    expiresAt,
    requestId: challengeId,
    origin: originNormalized,
    purpose,
    operation: input.operation,
    resource: input.resource,
    policyId: input.policyId ?? null,
  });

  const record: EphemeralWalletChallengeRecord = {
    challenge_id: challengeId,
    wallet_address: wallet,
    solana_network: canonicalNetwork,
    origin: originNormalized,
    uri: input.uri,
    session_context_hash: hashEphemeralSessionContext(input.sessionContext),
    nonce: challengeId,
    message,
    expires_at: expiresAt,
    purpose,
    operation: input.operation,
    resource: input.resource,
    policy_id: input.policyId ?? null,
  };

  try {
    await putEphemeralWalletChallenge(record, Math.floor(WALLET_SOL_AUTH_CHALLENGE_TTL_MS / 1000));
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }

  return {
    ok: true,
    challenge: {
      challenge_id: challengeId,
      message,
      expires_at: expiresAt,
      operation: input.operation,
    },
  };
}

export async function verifyWalletActionAuthorization(input: {
  challengeId: string;
  walletAddress: string;
  solanaNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
  expectedOperation: WalletActionOperation;
  expectedResource?: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const authorized = resolveAuthorizedSolanaNetworkFromEnv();
  if (!authorized) return { ok: false, code: "network_config_invalid" };
  const canonicalNetwork = canonicalizeSolanaNetwork(input.solanaNetwork);
  if (!canonicalNetwork || canonicalNetwork !== authorized) return { ok: false, code: "wrong_network" };

  let wallet: string;
  try {
    wallet = new PublicKey(input.walletAddress.trim()).toBase58();
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  let row;
  try {
    row = await peekEphemeralWalletChallenge(input.challengeId);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) return { ok: false, code: "store_unavailable" };
    throw error;
  }
  if (!row) return { ok: false, code: "replay" };
  if (row.operation !== input.expectedOperation) return { ok: false, code: "wrong_operation" };
  if (input.expectedResource && row.resource !== input.expectedResource) {
    return { ok: false, code: "wrong_resource" };
  }
  if (row.wallet_address !== wallet) return { ok: false, code: "wrong_signer" };
  if (row.session_context_hash !== hashEphemeralSessionContext(input.sessionContext)) {
    return { ok: false, code: "session_context_mismatch" };
  }
  if (new Date(row.expires_at) < new Date()) return { ok: false, code: "expired" };
  if (!originsMatch(row.origin, input.requestOrigin)) return { ok: false, code: "wrong_domain" };

  const valid = verifyPassportSolanaPersonalMessage({
    message: row.message,
    signature: input.signature,
    walletAddress: wallet,
  });
  if (!valid) return { ok: false, code: "invalid_signature" };

  const committed = await commitEphemeralWalletChallenge(input.challengeId);
  if (!committed) return { ok: false, code: "replay" };

  return { ok: true };
}
