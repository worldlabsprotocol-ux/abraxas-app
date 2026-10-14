// FILE: lib/persistence/authChallengeDirect.ts
import "server-only";

import { queryAbraxasPg } from "./pgPool";
import type { AuthChallengeConsumeResult } from "./identityPersistence";

function mapChallengeRow(row: Record<string, unknown>): AuthChallengeConsumeResult {
  return row as AuthChallengeConsumeResult;
}

export async function consumePassportEvmAuthChallengeDirect(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<AuthChallengeConsumeResult> {
  const result = await queryAbraxasPg<Record<string, unknown>>(
    `select * from public.consume_passport_evm_auth_challenge($1,$2,$3)`,
    [input.challengeId, input.walletAddress, input.sessionContextHash],
  );
  const row = result.rows[0];
  if (!row || row.id == null) return null;
  return mapChallengeRow(row);
}

export async function consumePassportSolanaAuthChallengeDirect(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<AuthChallengeConsumeResult> {
  const result = await queryAbraxasPg<Record<string, unknown>>(
    `select * from public.consume_passport_solana_auth_challenge($1,$2,$3)`,
    [input.challengeId, input.walletAddress, input.sessionContextHash],
  );
  const row = result.rows[0];
  if (!row || row.id == null) return null;
  return mapChallengeRow(row);
}

export async function consumePassportWalletAuthChallengeDirect(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<AuthChallengeConsumeResult> {
  const result = await queryAbraxasPg<Record<string, unknown>>(
    `select * from public.consume_passport_wallet_auth_challenge($1,$2,$3)`,
    [input.challengeId, input.walletAddress.toLowerCase(), input.sessionContextHash],
  );
  const row = result.rows[0];
  if (!row || row.id == null) return null;
  return mapChallengeRow(row);
}

export async function insertEvmChallengeDirect(row: {
  id: string;
  wallet_address: string;
  chain_id: number;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.passport_evm_auth_challenges (
      id, wallet_address, chain_id, origin, intended_action, session_context_hash, nonce, message, expires_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.id,
      row.wallet_address.toLowerCase(),
      row.chain_id,
      row.origin,
      row.intended_action,
      row.session_context_hash,
      row.nonce,
      row.message,
      row.expires_at,
    ],
  );
}

export async function insertSolanaChallengeDirect(row: {
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.passport_solana_auth_challenges (
      id, wallet_address, solana_network, origin, intended_action, session_context_hash, nonce, message, expires_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.id,
      row.wallet_address,
      row.solana_network,
      row.origin,
      row.intended_action,
      row.session_context_hash,
      row.nonce,
      row.message,
      row.expires_at,
    ],
  );
}

export async function insertWalletChallengeDirect(row: {
  id: string;
  wallet_address: string;
  sui_network: string;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.passport_wallet_auth_challenges (
      id, wallet_address, sui_network, origin, intended_action, session_context_hash, nonce, message, expires_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.id,
      row.wallet_address.toLowerCase(),
      row.sui_network,
      row.origin,
      row.intended_action,
      row.session_context_hash,
      row.nonce,
      row.message,
      row.expires_at,
    ],
  );
}
