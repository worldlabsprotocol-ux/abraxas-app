// FILE: lib/auth/passportEvmAuth/store.ts

import { createHash, randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export function hashSessionContext(value: string): string {
  return createHash("sha256").update(`holder-evm-ctx:${value}`).digest("hex");
}

export function createChallengeId(): string {
  return `peac_${randomBytes(12).toString("hex")}`;
}

export class PassportEvmAuthStoreUnavailableError extends Error {
  constructor() {
    super("passport_evm_auth_store_unavailable");
  }
}

export async function insertEvmChallenge(row: {
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
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("passport_evm_auth_challenges").insert({
    ...row,
    wallet_address: row.wallet_address.toLowerCase(),
  });
  if (error) {
    if (error.code === "42P01") throw new PassportEvmAuthStoreUnavailableError();
    throw error;
  }
}

export async function consumeEvmChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}) {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("consume_passport_evm_auth_challenge", {
    p_challenge_id: input.challengeId,
    p_wallet_address: input.walletAddress.toLowerCase(),
    p_session_context_hash: input.sessionContextHash,
  });
  if (error) {
    if (error.code === "42P01") throw new PassportEvmAuthStoreUnavailableError();
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}
