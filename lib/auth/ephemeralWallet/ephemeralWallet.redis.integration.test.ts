/**
 * Distributed ephemeral state — requires TCP Redis (CI service or ABRAXAS_EPHEMERAL_REDIS_URL).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  consumeEphemeralWalletChallenge,
  putEphemeralWalletChallenge,
  resetEphemeralChallengeStoreForTests,
} from "./challengeStore";
import {
  consumeSandboxPresentationCommit,
  resetSandboxPresentationCommitStoreForTests,
  storeSandboxPresentationCommit,
} from "./sandboxPresentationCommitStore";
import { resetEphemeralKvTcpForTests } from "./redisKv";

const redisUrl = process.env.ABRAXAS_EPHEMERAL_REDIS_URL?.trim() || process.env.REDIS_URL?.trim();
const redisEnabled = Boolean(redisUrl);

describe.runIf(redisEnabled)("ephemeral wallet redis (TCP)", () => {
  beforeAll(() => {
    process.env.ABRAXAS_EPHEMERAL_WALLET_AUTH = "1";
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET = "ephemeral-redis-integration-secret-32";
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
    process.env.NODE_ENV = "test";
    process.env.ABRAXAS_EPHEMERAL_REDIS_URL = redisUrl!;
    delete process.env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetEphemeralKvTcpForTests();
    resetEphemeralChallengeStoreForTests();
    resetSandboxPresentationCommitStoreForTests();
  });

  afterAll(() => {
    resetEphemeralChallengeStoreForTests();
    resetSandboxPresentationCommitStoreForTests();
    resetEphemeralKvTcpForTests();
  });

  it("rejects concurrent challenge consumption (single winner)", async () => {
    const record = {
      challenge_id: `ewch_redis_${Date.now()}`,
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
    const results = await Promise.all([
      consumeEphemeralWalletChallenge(record.challenge_id),
      consumeEphemeralWalletChallenge(record.challenge_id),
    ]);
    const winners = results.filter((r) => r !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0]?.challenge_id).toBe(record.challenge_id);
  });

  it("rejects concurrent sandbox presentation commit consumption (single winner)", async () => {
    const commitId = `esbx_pc_redis_${Date.now()}`;
    await storeSandboxPresentationCommit({
      commit_id: commitId,
      session_id: "sess_redis",
      workspace_id: "ws_redis",
      wallet_address: "11111111111111111111111111111111",
      policy_id: "age_21_retail",
      policy_version: 1,
      presentation_method_id: "authorized_test_issuer_credential",
      evidence_hash: "deadbeef",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      sandbox_labeled: true,
      production_trusted: false,
    });
    const results = await Promise.all([
      consumeSandboxPresentationCommit(commitId),
      consumeSandboxPresentationCommit(commitId),
    ]);
    const winners = results.filter((r) => r !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0]?.commit_id).toBe(commitId);
  });
});
