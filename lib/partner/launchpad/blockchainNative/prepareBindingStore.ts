import { createHash } from "node:crypto";
import { ephemeralKvGet, ephemeralKvSet, ephemeralKvSetNx, resolveEphemeralKvBackend } from "@/lib/auth/ephemeralWallet/redisKv";
import { EphemeralStateUnavailableError } from "@/lib/auth/ephemeralWallet/errors";
import {
  isDistributedProductionEnvironment,
  processTransientStateAllowed,
} from "@/lib/auth/ephemeralWallet/transientStatePolicy";
import type { BlockchainNativeExecutionBundleResult } from "./verifyExecutionBundle";

const CONFIRM_PREFIX = "abraxas:blockchain-native:confirm:v1:";
const JTI_PREFIX = "abraxas:blockchain-native:jti:v1:";

type MemoryEntry = { value: string; expiresAtMs: number };
const memoryConfirm = new Map<string, MemoryEntry>();
const memoryJti = new Map<string, MemoryEntry>();

function useDistributedStore(env: Record<string, string | undefined>): boolean {
  return resolveEphemeralKvBackend(env) !== "none";
}

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  if (isDistributedProductionEnvironment(env)) return false;
  return processTransientStateAllowed(env) || env.VITEST === "true";
}

function confirmKey(input: {
  applicationId: string;
  receiptId: string;
  transactionSignature: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.applicationId}|${input.receiptId}|${input.transactionSignature}`, "utf8")
    .digest("hex");
  return `${CONFIRM_PREFIX}${digest}`;
}

function jtiKey(jti: string): string {
  return `${JTI_PREFIX}${jti}`;
}

export type CachedConfirmResult = Extract<BlockchainNativeExecutionBundleResult, { ok: true }>;

type CachedConfirmWire = Omit<CachedConfirmResult, "chain_status_version"> & { chain_status_version: string };

function serializeCachedConfirm(result: CachedConfirmResult): CachedConfirmWire {
  return { ...result, chain_status_version: result.chain_status_version.toString() };
}

function deserializeCachedConfirm(wire: CachedConfirmWire): CachedConfirmResult {
  return { ...wire, chain_status_version: BigInt(wire.chain_status_version) };
}

export async function readCachedBlockchainNativeConfirm(
  input: { applicationId: string; receiptId: string; transactionSignature: string },
  env: Record<string, string | undefined> = process.env,
): Promise<CachedConfirmResult | null> {
  const key = confirmKey(input);
  if (useDistributedStore(env)) {
    const cached = await ephemeralKvGet<CachedConfirmWire>(key, env);
    return cached ? deserializeCachedConfirm(cached) : null;
  }
  if (!memoryAllowed(env)) return null;
  const entry = memoryConfirm.get(key);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    memoryConfirm.delete(key);
    return null;
  }
  return deserializeCachedConfirm(JSON.parse(entry.value) as CachedConfirmWire);
}

export async function writeCachedBlockchainNativeConfirm(
  input: { applicationId: string; receiptId: string; transactionSignature: string },
  result: CachedConfirmResult,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const key = confirmKey(input);
  const wire = serializeCachedConfirm(result);
  if (useDistributedStore(env)) {
    await ephemeralKvSet(key, wire, ttlSec, env);
    return;
  }
  if (!memoryAllowed(env)) {
    throw new EphemeralStateUnavailableError();
  }
  memoryConfirm.set(key, { value: JSON.stringify(wire), expiresAtMs: Date.now() + ttlSec * 1000 });
}

export async function assertPrepareJtiNotReusedWithOtherTx(input: {
  jti: string;
  transactionSignature: string;
  ttlSec: number;
}, env: Record<string, string | undefined> = process.env): Promise<
  { ok: true } | { ok: false; code: string }
> {
  const key = jtiKey(input.jti);
  if (useDistributedStore(env)) {
    const created = await ephemeralKvSetNx(key, input.transactionSignature, input.ttlSec, env);
    if (!created) {
      const existing = await ephemeralKvGet<string>(key, env);
      if (existing && existing !== input.transactionSignature) {
        return { ok: false, code: "prepare_binding_replay" };
      }
    }
    return { ok: true };
  }
  if (!memoryAllowed(env)) {
    return { ok: false, code: "prepare_binding_store_unavailable" };
  }
  const entry = memoryJti.get(key);
  if (entry && entry.expiresAtMs > Date.now() && entry.value !== input.transactionSignature) {
    return { ok: false, code: "prepare_binding_replay" };
  }
  if (!entry || entry.expiresAtMs <= Date.now()) {
    memoryJti.set(key, { value: input.transactionSignature, expiresAtMs: Date.now() + input.ttlSec * 1000 });
  }
  return { ok: true };
}

export function resetBlockchainNativePrepareBindingStoreForTests(): void {
  memoryConfirm.clear();
  memoryJti.clear();
}

export function requireBlockchainNativeConfirmStore(
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { ok: false; code: string } {
  if (useDistributedStore(env)) return { ok: true };
  if (memoryAllowed(env)) return { ok: true };
  if (isDistributedProductionEnvironment(env)) {
    return { ok: false, code: "prepare_binding_store_unavailable" };
  }
  return { ok: false, code: "prepare_binding_store_unavailable" };
}