// FILE: lib/auth/ephemeralWallet/redisKv.ts
// Shared ephemeral state backend: Upstash REST (Production) or TCP Redis (CI / self-hosted).

import type { Redis as UpstashRedis } from "@upstash/redis";
import { getEphemeralRedis, isEphemeralRedisConfigured } from "./redisClient";

export type EphemeralKvBackend = "upstash" | "tcp" | "none";

type TcpClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: "EX", ttlSec: number) => Promise<void>;
  getDel: (key: string) => Promise<string | null>;
  del: (...keys: string[]) => Promise<number>;
  ping: () => Promise<string>;
};

let tcpClient: TcpClient | null = null;
let tcpInit: Promise<TcpClient | null> | null = null;

function tcpRedisUrl(env: Record<string, string | undefined>): string | null {
  const raw =
    env.ABRAXAS_EPHEMERAL_REDIS_URL?.trim()
    || env.REDIS_URL?.trim()
    || null;
  if (!raw) return null;
  if (env.NODE_ENV === "production" && !env.ABRAXAS_EPHEMERAL_REDIS_URL?.trim()) {
    return null;
  }
  return raw;
}

async function loadTcpClient(env: Record<string, string | undefined>): Promise<TcpClient | null> {
  const url = tcpRedisUrl(env);
  if (!url) return null;
  if (tcpClient) return tcpClient;
  if (!tcpInit) {
    tcpInit = (async () => {
      const { createClient } = await import("redis");
      const client = createClient({
        url,
        socket: {
          connectTimeout: 4_000,
          reconnectStrategy: () => new Error("ephemeral_redis_unavailable"),
        },
      });
      client.on("error", () => {});
      await client.connect();
      tcpClient = {
        get: (key) => client.get(key),
        set: async (key, value, _mode, ttlSec) => {
          await client.set(key, value, { EX: ttlSec });
        },
        getDel: (key) => client.getDel(key),
        del: (...keys) => client.del(keys),
        ping: () => client.ping(),
      };
      return tcpClient;
    })();
  }
  return tcpInit;
}

export function resolveEphemeralKvBackend(
  env: Record<string, string | undefined> = process.env,
): EphemeralKvBackend {
  if (isEphemeralRedisConfigured(env)) return "upstash";
  if (tcpRedisUrl(env)) return "tcp";
  return "none";
}

export async function getEphemeralKvUpstash(
  env: Record<string, string | undefined> = process.env,
): Promise<UpstashRedis | null> {
  return getEphemeralRedis(env);
}

export async function getEphemeralKvTcp(
  env: Record<string, string | undefined> = process.env,
): Promise<TcpClient | null> {
  return loadTcpClient(env);
}

export async function ephemeralKvGet<T>(
  key: string,
  env: Record<string, string | undefined> = process.env,
): Promise<T | null> {
  const upstash = getEphemeralRedis(env);
  if (upstash) {
    return (await upstash.get(key)) as T | null;
  }
  const tcp = await loadTcpClient(env);
  if (tcp) {
    const raw = await tcp.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  }
  return null;
}

export async function ephemeralKvSet(
  key: string,
  value: unknown,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const upstash = getEphemeralRedis(env);
  if (upstash) {
    await upstash.set(key, value, { ex: ttlSec });
    return;
  }
  const tcp = await loadTcpClient(env);
  if (tcp) {
    await tcp.set(key, JSON.stringify(value), "EX", ttlSec);
    return;
  }
}

export async function ephemeralKvGetDel<T>(
  key: string,
  env: Record<string, string | undefined> = process.env,
): Promise<T | null> {
  const upstash = getEphemeralRedis(env);
  if (upstash) {
    const record = (await upstash.getdel(key)) as T | null;
    return record ?? null;
  }
  const tcp = await loadTcpClient(env);
  if (tcp) {
    const raw = await tcp.getDel(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  }
  return null;
}

export async function ephemeralKvDel(
  key: string,
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  const upstash = getEphemeralRedis(env);
  if (upstash) {
    return await upstash.del(key);
  }
  const tcp = await loadTcpClient(env);
  if (tcp) {
    return await tcp.del(key);
  }
  return 0;
}

export async function probeEphemeralKv(
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: boolean; backend: EphemeralKvBackend; code: string | null }> {
  const backend = resolveEphemeralKvBackend(env);
  if (backend === "upstash") {
    const redis = getEphemeralRedis(env);
    if (!redis) return { ok: false, backend, code: "redis_unavailable" };
    try {
      const probeKey = "abraxas:ephemeral:__probe__";
      await redis.set(probeKey, "1", { ex: 5 });
      await redis.del(probeKey);
      return { ok: true, backend, code: null };
    } catch {
      return { ok: false, backend, code: "redis_unreachable" };
    }
  }
  if (backend === "tcp") {
    try {
      const tcp = await loadTcpClient(env);
      if (!tcp) return { ok: false, backend, code: "redis_unavailable" };
      await tcp.ping();
      return { ok: true, backend, code: null };
    } catch {
      return { ok: false, backend, code: "redis_unreachable" };
    }
  }
  return { ok: false, backend: "none", code: "ephemeral_state_not_configured" };
}

export function resetEphemeralKvTcpForTests(): void {
  tcpClient = null;
  tcpInit = null;
}
