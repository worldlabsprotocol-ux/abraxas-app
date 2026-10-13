// FILE: lib/auth/passportSolanaAuth/store.ts

import { createHash, randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export function hashSessionContext(value: string): string {
  return createHash("sha256").update(`holder-sol-ctx:${value}`).digest("hex");
}

export function createChallengeId(): string {
  return `psac_${randomBytes(12).toString("hex")}`;
}

export class PassportSolanaAuthStoreUnavailableError extends Error {
  constructor() {
    super("passport_solana_auth_store_unavailable");
  }
}

export async function insertSolanaChallenge(row: {
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
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("passport_solana_auth_challenges").insert(row);
  if (error) {
    if (error.code === "42P01") throw new PassportSolanaAuthStoreUnavailableError();
    throw error;
  }
}

export async function consumeSolanaChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}) {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("consume_passport_solana_auth_challenge", {
    p_challenge_id: input.challengeId,
    p_wallet_address: input.walletAddress,
    p_session_context_hash: input.sessionContextHash,
  });
  if (error) {
    if (error.code === "42P01") throw new PassportSolanaAuthStoreUnavailableError();
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}
