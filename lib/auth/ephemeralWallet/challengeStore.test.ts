import { afterEach, describe, expect, it } from "vitest";
import {
  consumeEphemeralWalletChallenge,
  putEphemeralWalletChallenge,
  resetEphemeralChallengeStoreForTests,
} from "./challengeStore";

describe("ephemeral challenge store", () => {
  afterEach(() => {
    resetEphemeralChallengeStoreForTests();
  });

  it("consumes a challenge only once", async () => {
    process.env.VITEST = "true";
    process.env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST = "1";
    const record = {
      challenge_id: "ewch_test",
      wallet_address: "11111111111111111111111111111111",
      solana_network: "devnet",
      origin: "http://localhost:3000",
      uri: "http://localhost:3000/account",
      session_context_hash: "abc",
      nonce: "n",
      message: "msg",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    await putEphemeralWalletChallenge(record, 60);
    const first = await consumeEphemeralWalletChallenge("ewch_test");
    const second = await consumeEphemeralWalletChallenge("ewch_test");
    expect(first?.challenge_id).toBe("ewch_test");
    expect(second).toBeNull();
  });
});
