import {
  ephemeralKvEval,
  ephemeralKvGet,
  ephemeralKvSupportsAtomicScripts,
  resolveEphemeralKvBackend,
} from "@/lib/auth/ephemeralWallet/redisKv";
import type {
  CachedToken2022ConnectedConfirm,
  ConnectedSandboxPrepareAction,
  ConnectedSandboxPrepareRecord,
} from "./connectedSandboxPrepareStore";
import {
  LUA_ATOMIC_BIND_SIGNATURE,
  LUA_ATOMIC_COMMIT_CONFIRM,
  LUA_ATOMIC_PREPARE_TRANSITION,
} from "./connectedSandboxAtomicLua";

export type ConnectedSandboxPrepareBundleV2 = {
  v: 2;
  generation: number;
  prepare: ConnectedSandboxPrepareRecord;
  bound_transaction_signature: string | null;
};

const BUNDLE_PREFIX = "abraxas:token2022-connected:bundle:v2:";

type MemoryBundleEntry = { value: string; expiresAtMs: number };
const memoryBundles = new Map<string, MemoryBundleEntry>();

function bundleKey(jti: string, action: ConnectedSandboxPrepareAction): string {
  return `${BUNDLE_PREFIX}${jti}:${action}`;
}

function useDistributed(env: Record<string, string | undefined>): boolean {
  return resolveEphemeralKvBackend(env) !== "none";
}

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  return env.VITEST === "true" || env.NODE_ENV === "test" || env.NODE_ENV === "development";
}

function parseBundle(raw: string): ConnectedSandboxPrepareBundleV2 | null {
  try {
    const parsed = JSON.parse(raw) as ConnectedSandboxPrepareBundleV2;
    if (parsed.v !== 2 || typeof parsed.generation !== "number" || !parsed.prepare) return null;
    return parsed;
  } catch {
    return null;
  }
}

function memoryGet(key: string): ConnectedSandboxPrepareBundleV2 | null {
  const entry = memoryBundles.get(key);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    memoryBundles.delete(key);
    return null;
  }
  return parseBundle(entry.value);
}

function memorySet(key: string, bundle: ConnectedSandboxPrepareBundleV2, ttlSec: number): void {
  memoryBundles.set(key, {
    value: JSON.stringify(bundle),
    expiresAtMs: Date.now() + ttlSec * 1000,
  });
}

export function connectedSandboxAtomicTransitionsSupported(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!useDistributed(env)) return memoryAllowed(env);
  return ephemeralKvSupportsAtomicScripts(env);
}

export async function atomicConnectedSandboxPrepareTransition(
  record: Omit<ConnectedSandboxPrepareRecord, "generation">,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true; generation: number } | { ok: false; code: string }> {
  const key = bundleKey(record.jti, record.action);
  const prepareWire = JSON.stringify({
    v: record.v,
    action: record.action,
    jti: record.jti,
    application_id: record.application_id,
    partner_id: record.partner_id,
    holder_wallet: record.holder_wallet,
    receipt_id: record.receipt_id,
    cluster_label: record.cluster_label,
    message_hash_hex: record.message_hash_hex,
    expires_at: record.expires_at,
  });

  if (useDistributed(env)) {
    if (!ephemeralKvSupportsAtomicScripts(env)) {
      return { ok: false, code: "connected_atomic_store_unsupported" };
    }
    try {
      const generation = (await ephemeralKvEval(
        LUA_ATOMIC_PREPARE_TRANSITION,
        [key],
        [String(ttlSec), prepareWire],
        env,
      )) as number;
      if (!Number.isFinite(generation) || generation < 1) {
        return { ok: false, code: "connected_atomic_prepare_failed" };
      }
      return { ok: true, generation };
    } catch {
      return { ok: false, code: "connected_atomic_prepare_failed" };
    }
  }

  if (!memoryAllowed(env)) return { ok: false, code: "prepare_binding_store_unavailable" };
  const current = memoryGet(key);
  const generation = (current?.generation ?? 0) + 1;
  const prepare: ConnectedSandboxPrepareRecord = { ...record, generation };
  memorySet(
    key,
    {
      v: 2,
      generation,
      prepare,
      bound_transaction_signature: null,
    },
    ttlSec,
  );
  return { ok: true, generation };
}

export async function readConnectedSandboxPrepareBundle(
  jti: string,
  action: ConnectedSandboxPrepareAction,
  env: Record<string, string | undefined> = process.env,
): Promise<ConnectedSandboxPrepareBundleV2 | null> {
  const key = bundleKey(jti, action);
  if (useDistributed(env)) {
    const raw = await ephemeralKvGet<unknown>(key, env);
    if (!raw) return null;
    if (typeof raw === "string") return parseBundle(raw);
    if (typeof raw === "object") return raw as ConnectedSandboxPrepareBundleV2;
    return null;
  }
  if (!memoryAllowed(env)) return null;
  return memoryGet(key);
}

export async function atomicBindConnectedSandboxSignature(input: {
  jti: string;
  action: ConnectedSandboxPrepareAction;
  generation: number;
  transactionSignature: string;
  ttlSec: number;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const env = input.env ?? process.env;
  const key = bundleKey(input.jti, input.action);

  if (useDistributed(env)) {
    if (!ephemeralKvSupportsAtomicScripts(env)) {
      return { ok: false, code: "connected_atomic_store_unsupported" };
    }
    try {
      const code = (await ephemeralKvEval(
        LUA_ATOMIC_BIND_SIGNATURE,
        [key],
        [String(input.generation), input.transactionSignature, String(input.ttlSec)],
        env,
      )) as number;
      if (code === 1) return { ok: true };
      if (code === -2) return { ok: false, code: "prepare_superseded" };
      if (code === -3) return { ok: false, code: "prepare_binding_replay" };
      return { ok: false, code: "connected_prepare_not_found" };
    } catch {
      return { ok: false, code: "connected_atomic_prepare_failed" };
    }
  }

  if (!memoryAllowed(env)) return { ok: false, code: "prepare_binding_store_unavailable" };
  const bundle = memoryGet(key);
  if (!bundle) return { ok: false, code: "connected_prepare_not_found" };
  if (bundle.generation !== input.generation) return { ok: false, code: "prepare_superseded" };
  if (bundle.bound_transaction_signature && bundle.bound_transaction_signature !== input.transactionSignature) {
    return { ok: false, code: "prepare_binding_replay" };
  }
  bundle.bound_transaction_signature = input.transactionSignature;
  memorySet(key, bundle, input.ttlSec);
  return { ok: true };
}

export async function atomicCommitConnectedSandboxConfirm(input: {
  jti: string;
  action: ConnectedSandboxPrepareAction;
  generation: number;
  messageHashHex: string;
  transactionSignature: string;
  confirmKey: string;
  result: CachedToken2022ConnectedConfirm;
  ttlSec: number;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const env = input.env ?? process.env;
  const bundleKeyName = bundleKey(input.jti, input.action);
  const confirmPayload = JSON.stringify({
    ...input.result,
    preparation_generation: input.generation,
  });

  if (useDistributed(env)) {
    if (!ephemeralKvSupportsAtomicScripts(env)) {
      return { ok: false, code: "connected_atomic_store_unsupported" };
    }
    try {
      const code = (await ephemeralKvEval(
        LUA_ATOMIC_COMMIT_CONFIRM,
        [bundleKeyName, input.confirmKey],
        [
          String(input.generation),
          input.messageHashHex,
          input.transactionSignature,
          confirmPayload,
          String(input.ttlSec),
        ],
        env,
      )) as number;
      if (code === 1) return { ok: true };
      if (code === -2) return { ok: false, code: "prepare_superseded" };
      if (code === -3) return { ok: false, code: "connected_prepare_message_mismatch" };
      if (code === -4) return { ok: false, code: "prepare_binding_replay" };
      return { ok: false, code: "connected_prepare_not_found" };
    } catch {
      return { ok: false, code: "connected_atomic_prepare_failed" };
    }
  }

  if (!memoryAllowed(env)) return { ok: false, code: "prepare_binding_store_unavailable" };
  const bundle = memoryGet(bundleKeyName);
  if (!bundle) return { ok: false, code: "connected_prepare_not_found" };
  if (bundle.generation !== input.generation) return { ok: false, code: "prepare_superseded" };
  if (bundle.prepare.message_hash_hex !== input.messageHashHex) {
    return { ok: false, code: "connected_prepare_message_mismatch" };
  }
  if (bundle.bound_transaction_signature !== input.transactionSignature) {
    return { ok: false, code: "prepare_binding_replay" };
  }
  return { ok: true };
}

export function resetConnectedSandboxAtomicBundlesForTests(): void {
  memoryBundles.clear();
}