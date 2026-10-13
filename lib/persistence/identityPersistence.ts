// FILE: lib/persistence/identityPersistence.ts
// Narrow persistence ports for chain-neutral identity (no Supabase types in callers).

import { requirePersistenceAdmin } from "./admin";

export type AuthChallengeConsumeResult = {
  id: string;
  wallet_address: string;
  chain_id?: number;
  solana_network?: string;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
} | null;

export async function consumePassportEvmAuthChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<AuthChallengeConsumeResult> {
  const db = requirePersistenceAdmin();
  const { data, error } = await db.rpc("consume_passport_evm_auth_challenge", {
    p_challenge_id: input.challengeId,
    p_wallet_address: input.walletAddress,
    p_session_context_hash: input.sessionContextHash,
  });
  if (error) {
    if (error.code === "42P01") throw new Error("holder_auth_store_unavailable");
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AuthChallengeConsumeResult) ?? null;
}

export async function consumePassportSolanaAuthChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<AuthChallengeConsumeResult> {
  const db = requirePersistenceAdmin();
  const { data, error } = await db.rpc("consume_passport_solana_auth_challenge", {
    p_challenge_id: input.challengeId,
    p_wallet_address: input.walletAddress,
    p_session_context_hash: input.sessionContextHash,
  });
  if (error) {
    if (error.code === "42P01") throw new Error("holder_auth_store_unavailable");
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AuthChallengeConsumeResult) ?? null;
}
