// FILE: lib/auth/passportEvmAuth/store.ts

import { createHash, randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { consumePassportEvmAuthChallenge } from "@/lib/persistence/identityPersistence";

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
  if (persistenceUsesDirectPostgres()) {
    try {
      const { insertEvmChallengeDirect } = await import("@/lib/persistence/authChallengeDirect");
      await insertEvmChallengeDirect(row);
    } catch (error) {
      if (error instanceof Error && /does not exist|42P01/.test(error.message)) {
        throw new PassportEvmAuthStoreUnavailableError();
      }
      throw error;
    }
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("passport_evm_auth_challenges").insert({
    ...row,
    wallet_address: row.wallet_address.toLowerCase(),
  });
  if (error) {
    if (error.code === "42P01") throw new PassportEvmAuthStoreUnavailableError();
    throw error;
  }
}

export type EvmAuthChallengeRow = {
  id: string;
  wallet_address: string;
  chain_id: number;
  origin: string;
  intended_action: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
};

export async function consumeEvmChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<EvmAuthChallengeRow | null> {
  try {
    const row = await consumePassportEvmAuthChallenge({
      challengeId: input.challengeId,
      walletAddress: input.walletAddress.toLowerCase(),
      sessionContextHash: input.sessionContextHash,
    });
    return row as EvmAuthChallengeRow | null;
  } catch (e) {
    if (e instanceof Error && e.message === "holder_auth_store_unavailable") {
      throw new PassportEvmAuthStoreUnavailableError();
    }
    throw e;
  }
}
