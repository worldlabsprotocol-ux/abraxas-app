import { beforeEach, describe, expect, it, vi } from "vitest";

const directInsert = vi.hoisted(() => vi.fn());
const postgrest = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({
  isPassportDirectPostgresEnabled: () => true,
}));
vi.mock("@/lib/persistence/admin", () => ({ requirePersistenceAdmin: postgrest }));
vi.mock("@/lib/persistence/authChallengeDirect", () => ({
  insertSolanaChallengeDirect: directInsert,
}));

import { insertSolanaChallenge } from "./store";

describe("Passport Solana challenge sovereign store", () => {
  beforeEach(() => {
    directInsert.mockReset();
    postgrest.mockClear();
  });

  it("uses Passport PostgreSQL without consulting PostgREST", async () => {
    const challenge = {
      id: "psac_test",
      wallet_address: "11111111111111111111111111111111",
      solana_network: "devnet",
      origin: "https://abraxasworld.xyz",
      intended_action: "passport_sign_in",
      session_context_hash: "ctx",
      nonce: "nonce",
      message: "message",
      expires_at: "2026-11-02T15:00:00.000Z",
    };

    await insertSolanaChallenge(challenge);

    expect(directInsert).toHaveBeenCalledWith(challenge);
    expect(postgrest).not.toHaveBeenCalled();
  });
});
