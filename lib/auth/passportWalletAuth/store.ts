// FILE: lib/auth/passportWalletAuth/store.ts

import { createHash, randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";

export interface PassportWalletChallengeRow {
  id: string;
  wallet_address: string;
  sui_network: string;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
}

export function hashSessionContext(value: string): string {
  return createHash("sha256").update(`passport-wallet-ctx:${value}`).digest("hex");
}

export function createPassportWalletNonce(): string {
  return randomBytes(16).toString("hex");
}

export function createPassportWalletChallengeId(): string {
  return `pwac_${randomBytes(12).toString("hex")}`;
}

export async function insertPassportWalletChallenge(row: Omit<PassportWalletChallengeRow, "consumed_at">): Promise<void> {
  if (persistenceUsesDirectPostgres()) {
    try {
      const { insertWalletChallengeDirect } = await import("@/lib/persistence/authChallengeDirect");
      await insertWalletChallengeDirect(row);
    } catch (error) {
      if (error instanceof Error && /does not exist|42P01/.test(error.message)) {
        throw new PassportWalletAuthStoreUnavailableError();
      }
      throw error;
    }
    return;
  }
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("passport_wallet_auth_challenges").insert({
    id: row.id,
    wallet_address: row.wallet_address.toLowerCase(),
    sui_network: row.sui_network,
    origin: row.origin,
    intended_action: row.intended_action,
    session_context_hash: row.session_context_hash,
    nonce: row.nonce,
    message: row.message,
    expires_at: row.expires_at,
  });
  if (error) {
    if (error.code === "42P01") {
      throw new PassportWalletAuthStoreUnavailableError();
    }
    throw error;
  }
}

export class PassportWalletAuthStoreUnavailableError extends Error {
  constructor() {
    super("passport_wallet_auth_store_unavailable");
  }
}

export async function consumePassportWalletChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<PassportWalletChallengeRow | null> {
  if (persistenceUsesDirectPostgres()) {
    try {
      const { consumePassportWalletAuthChallengeDirect } = await import("@/lib/persistence/authChallengeDirect");
      const row = await consumePassportWalletAuthChallengeDirect({
        challengeId: input.challengeId,
        walletAddress: input.walletAddress,
        sessionContextHash: input.sessionContextHash,
      });
      return (row as PassportWalletChallengeRow | null) ?? null;
    } catch (error) {
      if (error instanceof Error && /does not exist|42P01/.test(error.message)) {
        throw new PassportWalletAuthStoreUnavailableError();
      }
      throw error;
    }
  }
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("consume_passport_wallet_auth_challenge", {
    p_challenge_id: input.challengeId,
    p_wallet_address: input.walletAddress.toLowerCase(),
    p_session_context_hash: input.sessionContextHash,
  });
  if (error) {
    if (error.code === "42P01" || error.message?.includes("consume_passport_wallet_auth_challenge")) {
      throw new PassportWalletAuthStoreUnavailableError();
    }
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PassportWalletChallengeRow | null) ?? null;
}
