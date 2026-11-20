/**
 * Distributed connected-sandbox atomic transitions — requires TCP Redis
 * (ABRAXAS_EPHEMERAL_REDIS_URL or REDIS_URL). Not in-memory mocks.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEphemeralKvTcpForTests } from "@/lib/auth/ephemeralWallet/redisKv";
import {
  atomicBindConnectedSandboxSignature,
  atomicConnectedSandboxPrepareTransition,
  readConnectedSandboxPrepareBundle,
  resetConnectedSandboxAtomicBundlesForTests,
} from "./connectedSandboxAtomicBundle";

const redisUrl = process.env.ABRAXAS_EPHEMERAL_REDIS_URL?.trim() || process.env.REDIS_URL?.trim();
const redisEnabled = Boolean(redisUrl);

function prepareBase(jti: string, hash: string) {
  return {
    v: 1 as const,
    action: "mint" as const,
    jti,
    application_id: "app-redis",
    partner_id: "partner-redis",
    holder_wallet: "11111111111111111111111111111112",
    receipt_id: "dr_redis",
    cluster_label: "redis-it",
    message_hash_hex: hash,
    expires_at: Math.floor(Date.now() / 1000) + 600,
  };
}

describe.runIf(redisEnabled)("connected sandbox atomic bundle (TCP Redis)", () => {
  const env: Record<string, string | undefined> = {};

  beforeAll(() => {
    env.NODE_ENV = "test";
    env.ABRAXAS_EPHEMERAL_REDIS_URL = redisUrl;
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    resetEphemeralKvTcpForTests();
    resetConnectedSandboxAtomicBundlesForTests();
    process.env.ABRAXAS_BUILD986_DISTRIBUTED_ATOMIC_ACCEPTANCE = "1";
  });

  afterAll(() => {
    resetConnectedSandboxAtomicBundlesForTests();
    resetEphemeralKvTcpForTests();
    delete process.env.ABRAXAS_BUILD986_DISTRIBUTED_ATOMIC_ACCEPTANCE;
  });

  it("serializes racing prepare transitions with monotonic generations", async () => {
    const jti = `jti-redis-${Date.now()}`;
    const results = await Promise.all(
      ["h1", "h2", "h3", "h4"].map((suffix) =>
        atomicConnectedSandboxPrepareTransition(prepareBase(jti, suffix.repeat(64)), 300, env),
      ),
    );
    const generations = results.filter((r) => r.ok).map((r) => (r.ok ? r.generation : 0));
    expect(generations).toHaveLength(4);
    expect(new Set(generations).size).toBe(4);
    const bundle = await readConnectedSandboxPrepareBundle(jti, "mint", env);
    expect(bundle?.generation).toBe(Math.max(...generations));
  });

  it("rejects signature binding for superseded generation after concurrent refresh", async () => {
    const jti = `jti-redis-bind-${Date.now()}`;
    const first = await atomicConnectedSandboxPrepareTransition(prepareBase(jti, "a".repeat(64)), 300, env);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const staleBind = await atomicBindConnectedSandboxSignature({
      jti,
      action: "mint",
      generation: first.generation,
      transactionSignature: "sig-stale",
      ttlSec: 120,
      env,
    });
    expect(staleBind).toEqual({ ok: true });

    const second = await atomicConnectedSandboxPrepareTransition(prepareBase(jti, "b".repeat(64)), 300, env);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const replayOnOldGen = await atomicBindConnectedSandboxSignature({
      jti,
      action: "mint",
      generation: first.generation,
      transactionSignature: "sig-other",
      ttlSec: 120,
      env,
    });
    expect(replayOnOldGen).toEqual({ ok: false, code: "prepare_superseded" });
  });
});