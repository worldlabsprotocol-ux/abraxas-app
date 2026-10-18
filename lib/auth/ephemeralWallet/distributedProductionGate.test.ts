import { afterEach, describe, expect, it } from "vitest";
import { validateEphemeralWalletRuntimeConfig } from "./configValidation";
import { probeEphemeralChallengeStore, putEphemeralWalletChallenge } from "./challengeStore";
import { resolveEphemeralWalletAuthOperationalAsync } from "./operational";
import { EphemeralStateUnavailableError } from "./errors";
import { resetEphemeralChallengeStoreForTests } from "./challengeStore";

const baseProdEnv: Record<string, string> = {
  ABRAXAS_EPHEMERAL_WALLET_AUTH: "1",
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  ABRAXAS_ACCOUNT_SESSION_SECRET: "distributed-gate-test-session-secret-32",
  NEXT_PUBLIC_SOLANA_NETWORK: "devnet",
};

describe("distributed production replay gate", () => {
  afterEach(() => {
    resetEphemeralChallengeStoreForTests();
  });

  it("rejects process-local challenge storage configuration in distributed Production", () => {
    const env = { ...baseProdEnv, ABRAXAS_EPHEMERAL_TRANSIENT_BACKEND: "process" };
    const config = validateEphemeralWalletRuntimeConfig(env);
    expect(config.ok).toBe(false);
    if (!config.ok) {
      expect(config.code).toBe("process_backend_forbidden_in_production");
    }
  });

  it("fails closed when authoritative replay (Redis) is not configured in Production", async () => {
    const env = { ...baseProdEnv };
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    delete env.ABRAXAS_EPHEMERAL_REDIS_URL;

    const config = validateEphemeralWalletRuntimeConfig(env);
    expect(config.ok).toBe(false);
    if (!config.ok) expect(config.code).toBe("distributed_replay_not_configured");

    const probe = await probeEphemeralChallengeStore(env);
    expect(probe.ok).toBe(false);
    expect(probe.code).toBe("distributed_replay_not_configured");

    const op = await resolveEphemeralWalletAuthOperationalAsync(env);
    expect(op.operational).toBe(false);
    expect(op.production_activation_blocked).toBe(true);
    expect(op.missing_capability).toBe("distributed_replay_not_configured");
  });

  it("does not allow challenge creation on process memory in Production", async () => {
    const env = { ...baseProdEnv };
    await expect(
      putEphemeralWalletChallenge(
        {
          challenge_id: "ewch_prod_block",
          wallet_address: "11111111111111111111111111111111",
          solana_network: "devnet",
          origin: "https://example.com",
          uri: "https://example.com",
          session_context_hash: "x",
          nonce: "n",
          message: "m",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        60,
        env,
      ),
    ).rejects.toBeInstanceOf(EphemeralStateUnavailableError);
  });

  it("fails operational when Redis is required but unreachable (no process fallback)", async () => {
    const env = {
      ...baseProdEnv,
      UPSTASH_REDIS_REST_URL: "https://invalid-redis.example",
      UPSTASH_REDIS_REST_TOKEN: "invalid-token",
    };
    const op = await resolveEphemeralWalletAuthOperationalAsync(env);
    expect(op.operational).toBe(false);
    expect(op.distributed_replay_enforced).toBe(true);
    expect(op.config_ok).toBe(true);
    expect(op.state_store_ok).toBe(false);
  }, 15_000);

  it("allows process-local challenges in isolated integration test environment", async () => {
    const env = {
      ABRAXAS_EPHEMERAL_WALLET_AUTH: "1",
      ABRAXAS_EPHEMERAL_INTEGRATION_TEST: "1",
      NODE_ENV: "test",
      VITEST: "true",
      ABRAXAS_ACCOUNT_SESSION_SECRET: "distributed-gate-test-session-secret-32",
      NEXT_PUBLIC_SOLANA_NETWORK: "devnet",
    };
    const config = validateEphemeralWalletRuntimeConfig(env);
    expect(config.ok).toBe(true);
    const probe = await probeEphemeralChallengeStore(env);
    expect(probe.ok).toBe(true);
    expect(probe.backend).toBe("memory");
  });
});
