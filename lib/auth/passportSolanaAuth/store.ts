// FILE: lib/auth/passportSolanaAuth/store.ts

import { createHash, randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { consumePassportSolanaAuthChallenge } from "@/lib/persistence/identityPersistence";

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
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("passport_solana_auth_challenges").insert(row);
  if (error) {
    if (error.code === "42P01") throw new PassportSolanaAuthStoreUnavailableError();
    throw error;
  }
}

export type SolanaAuthChallengeRow = {
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
};

export async function consumeSolanaChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<SolanaAuthChallengeRow | null> {
  try {
    const row = await consumePassportSolanaAuthChallenge({
      challengeId: input.challengeId,
      walletAddress: input.walletAddress,
      sessionContextHash: input.sessionContextHash,
    });
    return row as SolanaAuthChallengeRow | null;
  } catch (e) {
    if (e instanceof Error && e.message === "holder_auth_store_unavailable") {
      throw new PassportSolanaAuthStoreUnavailableError();
    }
    throw e;
  }
}
