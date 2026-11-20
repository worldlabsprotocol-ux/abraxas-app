import { createHash } from "node:crypto";
import { ephemeralKvGet, resolveEphemeralKvBackend } from "@/lib/auth/ephemeralWallet/redisKv";
import { EphemeralStateUnavailableError } from "@/lib/auth/ephemeralWallet/errors";
import {
  isDistributedProductionEnvironment,
  processTransientStateAllowed,
} from "@/lib/auth/ephemeralWallet/transientStatePolicy";
import {
  atomicBindConnectedSandboxSignature,
  atomicCommitConnectedSandboxConfirm,
  atomicConnectedSandboxPrepareTransition,
  connectedSandboxAtomicTransitionsSupported,
  readConnectedSandboxPrepareBundle,
  resetConnectedSandboxAtomicBundlesForTests,
} from "./connectedSandboxAtomicBundle";

export type CachedToken2022ConnectedConfirm = {
  ok: true;
  phase: "mint_confirmed" | "consume_confirmed";
  prepared_message_hash_hex: string;
  preparation_generation: number;
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
  generation: number;
};

type MemoryConfirmEntry = { value: string; expiresAtMs: number };
const memoryConfirm = new Map<string, MemoryConfirmEntry>();

function useDistributedStore(env: Record<string, string | undefined>): boolean {
  return resolveEphemeralKvBackend(env) !== "none";
}

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  if (isDistributedProductionEnvironment(env)) return false;
  return processTransientStateAllowed(env) || env.VITEST === "true";
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

export function requireConnectedSandboxPrepareStore(
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { ok: false; code: string } {
  if (useDistributedStore(env)) {
    if (!connectedSandboxAtomicTransitionsSupported(env)) {
      return { ok: false, code: "connected_atomic_store_unsupported" };
    }
    return { ok: true };
  }
  if (memoryAllowed(env)) return { ok: true };
  return { ok: false, code: "prepare_binding_store_unavailable" };
}

export async function writeConnectedSandboxPrepareRecord(
  record: Omit<ConnectedSandboxPrepareRecord, "generation">,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const result = await atomicConnectedSandboxPrepareTransition(record, ttlSec, env);
  if (!result.ok) throw new EphemeralStateUnavailableError();
}

export async function readConnectedSandboxPrepareRecord(
  jti: string,
  action: ConnectedSandboxPrepareAction,
  env: Record<string, string | undefined> = process.env,
): Promise<ConnectedSandboxPrepareRecord | null> {
  const bundle = await readConnectedSandboxPrepareBundle(jti, action, env);
  if (!bundle) return null;
  if (bundle.prepare.expires_at <= Math.floor(Date.now() / 1000)) return null;
  return bundle.prepare;
}

export async function assertConnectedSandboxJtiActionNotReusedWithOtherTx(
  input: {
    jti: string;
    action: ConnectedSandboxPrepareAction;
    transactionSignature: string;
    ttlSec: number;
    generation: number;
  },
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true } | { ok: false; code: string }> {
  return atomicBindConnectedSandboxSignature({
    jti: input.jti,
    action: input.action,
    generation: input.generation,
    transactionSignature: input.transactionSignature,
    ttlSec: input.ttlSec,
    env,
  });
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
    if (typeof cached === "string") {
      const parsed = JSON.parse(cached) as CachedToken2022ConnectedConfirm;
      if (parsed.prepared_message_hash_hex !== input.messageHashHex) return null;
      return parsed;
    }
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
    generation: number;
  },
  result: CachedToken2022ConnectedConfirm,
  ttlSec: number,
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const key = confirmKey(input);
  const payload: CachedToken2022ConnectedConfirm = {
    ...result,
    preparation_generation: input.generation,
    prepared_message_hash_hex: input.messageHashHex,
  };

  const commit = await atomicCommitConnectedSandboxConfirm({
    jti: input.jti,
    action: input.action,
    generation: input.generation,
    messageHashHex: input.messageHashHex,
    transactionSignature: input.transactionSignature,
    confirmKey: key,
    result: payload,
    ttlSec,
    env,
  });
  if (!commit.ok) return commit;

  if (!useDistributedStore(env) && memoryAllowed(env)) {
    memoryConfirm.set(key, { value: JSON.stringify(payload), expiresAtMs: Date.now() + ttlSec * 1000 });
  }
  return { ok: true };
}

export function resetConnectedSandboxPrepareStoreForTests(): void {
  memoryConfirm.clear();
  resetConnectedSandboxAtomicBundlesForTests();
}