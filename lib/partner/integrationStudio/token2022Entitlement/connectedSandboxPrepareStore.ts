import { createHash } from "node:crypto";
import {
  ephemeralKvDel,
  ephemeralKvGet,
  ephemeralKvSet,
  ephemeralKvSetNx,
  resolveEphemeralKvBackend,
} from "@/lib/auth/ephemeralWallet/redisKv";
import { EphemeralStateUnavailableError } from "@/lib/auth/ephemeralWallet/errors";
import {
  isDistributedProductionEnvironment,
  processTransientStateAllowed,
} from "@/lib/auth/ephemeralWallet/transientStatePolicy";
export type CachedToken2022ConnectedConfirm = {
  ok: true;
  phase: "mint_confirmed" | "consume_confirmed";
  prepared_message_hash_hex: string;
  transaction_signature: string;
  observation_slot: number;
  confirmation_commitment: "finalized" | "confirmed";
  token_balance: string | null;
  consumption_initialized: boolean;
  public_accounts: {
    registry: string;
    commitment: string;
    entitlement_mint: string;
    trusted_config: string;
    issuance_ledger: string;
    consumption: string;
    holder_token_account: string;
  };
  verification_tiers: {
    execution_report: { tier: "chain_transaction_signature"; disclaimer: string };
    structural_semantic: { tier: "not_applicable"; disclaimer: string };
    authenticated_chain: { tier: "rpc_observation"; status: "observed"; disclaimer: string };
  };
};

const PREPARE_PREFIX = "abraxas:token2022-connected:prepare:v1:";
const JTI_ACTION_PREFIX = "abraxas:token2022-connected:jti:v1:";
const CONFIRM_PREFIX = "abraxas:token2022-connected:confirm:v1:";

export type ConnectedSandboxPrepareAction = "mint" | "consume";

export type ConnectedSandboxPrepareRecord = {
  v: 1;
  action: ConnectedSandboxPrepareAction;
  jti: string;
  application_id: string;
  partner_id: string;
  holder_wallet: string;
  receipt_id: string;
  cluster_label: string;
  message_hash_hex: string;
  expires_at: number;
};

type MemoryEntry = { value: string; expiresAtMs: number };
const memoryPrepare = new Map<string, MemoryEntry>();
const memoryJtiAction = new Map<string, MemoryEntry>();
const memoryConfirm = new Map<string, MemoryEntry>();

function useDistributedStore(env: Record<string, string | undefined>): boolean {
  return resolveEphemeralKvBackend(env) !== "none";
}

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  if (isDistributedProductionEnvironment(env)) return false;
  return processTransientStateAllowed(env) || env.VITEST === "true";
}

function prepareKey(jti: string, action: ConnectedSandboxPrepareAction): string {
  return `${PREPARE_PREFIX}${jti}:${action}`;
}

function jtiActionKey(jti: string, action: ConnectedSandboxPrepareAction): string {
  return `${JTI_ACTION_PREFIX}${jti}:${action}`;
}

function confirmKey(input: {
  jti: string;
  action: ConnectedSandboxPrepareAction;
  messageHashHex: string;
  transactionSignature: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.jti}|${input.action}|${input.messageHashHex}|${input.transactionSignature}`, "utf8")
    .digest("hex");
  return `${CONFIRM_PREFIX}${digest}`;
}

export async function resetConnectedSandboxJtiActionBinding(
  jti: string,
  action: ConnectedSandboxPrepareAction,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const key = jtiActionKey(jti, action);
  if (useDistributedStore(env)) {
    await ephemeralKvDel(key, env);
    return;
  }
  if (memoryAllowed(env)) memoryJtiAction.delete(key);
}

export function requireConnectedSandboxPrepareStore(
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { ok: false; code: string } {
  if (useDistributedStore(env)) return { ok: true };
  if (memoryAllowed(env)) return { ok: true };
  return { ok: false, code: "prepare_binding_store_unavailable" };
}

export async function writeConnectedSandboxPrepareRecord(
  record: ConnectedSandboxPrepareRecord,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const key = prepareKey(record.jti, record.action);
  const wire = JSON.stringify(record);
  if (useDistributedStore(env)) {
    await ephemeralKvSet(key, record, ttlSec, env);
    await resetConnectedSandboxJtiActionBinding(record.jti, record.action, env);
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memoryPrepare.set(key, { value: wire, expiresAtMs: Date.now() + ttlSec * 1000 });
  await resetConnectedSandboxJtiActionBinding(record.jti, record.action, env);
}

export async function readConnectedSandboxPrepareRecord(
  jti: string,
  action: ConnectedSandboxPrepareAction,
  env: Record<string, string | undefined> = process.env,
): Promise<ConnectedSandboxPrepareRecord | null> {
  const key = prepareKey(jti, action);
  if (useDistributedStore(env)) {
    return ephemeralKvGet<ConnectedSandboxPrepareRecord>(key, env);
  }
  if (!memoryAllowed(env)) return null;
  const entry = memoryPrepare.get(key);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    memoryPrepare.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as ConnectedSandboxPrepareRecord;
}

export async function assertConnectedSandboxJtiActionNotReusedWithOtherTx(
  input: {
    jti: string;
    action: ConnectedSandboxPrepareAction;
    transactionSignature: string;
    ttlSec: number;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const key = jtiActionKey(input.jti, input.action);
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
  const entry = memoryJtiAction.get(key);
  if (entry && entry.expiresAtMs > Date.now() && entry.value !== input.transactionSignature) {
    return { ok: false, code: "prepare_binding_replay" };
  }
  if (!entry || entry.expiresAtMs <= Date.now()) {
    memoryJtiAction.set(key, {
      value: input.transactionSignature,
      expiresAtMs: Date.now() + input.ttlSec * 1000,
    });
  }
  return { ok: true };
}

export async function readCachedToken2022ConnectedConfirm(
  input: {
    jti: string;
    action: ConnectedSandboxPrepareAction;
    messageHashHex: string;
    transactionSignature: string;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<CachedToken2022ConnectedConfirm | null> {
  const key = confirmKey(input);
  if (useDistributedStore(env)) {
    const cached = await ephemeralKvGet<CachedToken2022ConnectedConfirm>(key, env);
    if (!cached) return null;
    if (cached.prepared_message_hash_hex !== input.messageHashHex) return null;
    return cached;
  }
  if (!memoryAllowed(env)) return null;
  const entry = memoryConfirm.get(key);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    memoryConfirm.delete(key);
    return null;
  }
  const parsed = JSON.parse(entry.value) as CachedToken2022ConnectedConfirm;
  if (parsed.prepared_message_hash_hex !== input.messageHashHex) return null;
  return parsed;
}

export async function writeCachedToken2022ConnectedConfirm(
  input: {
    jti: string;
    action: ConnectedSandboxPrepareAction;
    messageHashHex: string;
    transactionSignature: string;
  },
  result: CachedToken2022ConnectedConfirm,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const key = confirmKey(input);
  if (useDistributedStore(env)) {
    await ephemeralKvSet(key, result, ttlSec, env);
    return;
  }
  if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
  memoryConfirm.set(key, { value: JSON.stringify(result), expiresAtMs: Date.now() + ttlSec * 1000 });
}

export function resetConnectedSandboxPrepareStoreForTests(): void {
  memoryPrepare.clear();
  memoryJtiAction.clear();
  memoryConfirm.clear();
}