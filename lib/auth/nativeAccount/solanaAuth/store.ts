// FILE: lib/auth/nativeAccount/solanaAuth/store.ts

import { createHash, randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { nativeAccountMemory } from "../memoryStore";
import {
  assertNativeAccountPersistenceBackend,
  nativeAccountUsesDirectPostgres,
  nativeAccountUsesMemory,
} from "../nativeAccountPersistence";
import { NativeAccountStoreUnavailableError } from "../storeErrors";
import * as pgStore from "../postgresDirectStore";

export function hashAccountSolSessionContext(value: string): string {
  return createHash("sha256").update(`abx-ac-sol-ctx:${value}`).digest("hex");
}

export function createAccountSolChallengeId(): string {
  return `asac_${randomBytes(12).toString("hex")}`;
}

export function createAccountSolWalletLinkId(): string {
  return `aswl_${randomBytes(12).toString("hex")}`;
}

export type AccountSolanaChallengeRow = {
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  uri: string;
  request_id: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
};

function useMemory(): boolean {
  return nativeAccountUsesMemory();
}

function usePostgresDirect(): boolean {
  return nativeAccountUsesDirectPostgres();
}

function persistenceAdmin() {
  assertNativeAccountPersistenceBackend();
  return requirePersistenceAdmin();
}

export async function insertAccountSolanaChallenge(row: {
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  uri: string;
  request_id: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
}): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.insertSolanaChallenge(row);
    return;
  }
  if (usePostgresDirect()) {
    await pgStore.insertAccountSolanaChallenge(row);
    return;
  }
  const sb = persistenceAdmin();
  const { error } = await sb.from("abraxas_account_solana_auth_challenges").insert(row);
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function consumeAccountSolanaChallenge(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<AccountSolanaChallengeRow | null> {
  if (useMemory()) {
    return nativeAccountMemory.consumeSolanaChallengeAtomic(input);
  }
  if (usePostgresDirect()) {
    return pgStore.consumeAccountSolanaChallengeAtomic(input);
  }
  const sb = persistenceAdmin();
  const { data, error } = await sb.rpc("abraxas_consume_account_solana_challenge_atomic", {
    p_challenge_id: input.challengeId,
    p_wallet_address: input.walletAddress,
    p_session_context_hash: input.sessionContextHash,
  });
  if (error) {
    if (error.code === "42883" || error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  const payload = data as {
    ok?: boolean;
    wallet_address?: string;
    solana_network?: string;
    origin?: string;
    uri?: string;
    request_id?: string;
    nonce?: string;
    message?: string;
    expires_at?: string;
  };
  if (!payload?.ok) return null;
  return {
    id: input.challengeId,
    wallet_address: String(payload.wallet_address),
    solana_network: String(payload.solana_network),
    origin: String(payload.origin),
    uri: String(payload.uri),
    request_id: String(payload.request_id),
    session_context_hash: input.sessionContextHash,
    nonce: String(payload.nonce),
    message: String(payload.message),
    expires_at: String(payload.expires_at),
    consumed_at: new Date().toISOString(),
  };
}

export async function findAccountIdBySolanaWallet(
  walletAddress: string,
  solanaNetwork: string,
): Promise<string | null> {
  if (useMemory()) {
    return nativeAccountMemory.findAccountBySolanaWallet(walletAddress, solanaNetwork);
  }
  if (usePostgresDirect()) {
    return pgStore.findAccountIdBySolanaWallet(walletAddress, solanaNetwork);
  }
  const sb = persistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_account_solana_wallets")
    .select("account_id")
    .eq("wallet_address", walletAddress)
    .eq("solana_network", solanaNetwork)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return data?.account_id ? String(data.account_id) : null;
}

export async function linkSolanaWalletToAccount(input: {
  accountId: string;
  walletAddress: string;
  solanaNetwork: string;
}): Promise<void> {
  const id = createAccountSolWalletLinkId();
  if (useMemory()) {
    nativeAccountMemory.linkSolanaWallet({ ...input, id });
    return;
  }
  if (usePostgresDirect()) {
    await pgStore.linkSolanaWalletToAccount({ ...input, id });
    return;
  }
  const sb = persistenceAdmin();
  const { error } = await sb.from("abraxas_account_solana_wallets").insert({
    id,
    account_id: input.accountId,
    wallet_address: input.walletAddress,
    solana_network: input.solanaNetwork,
    last_used_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    if (error.code === "23505") return;
    throw error;
  }
}

export async function getPrimarySolanaWalletForAccount(
  accountId: string,
): Promise<{ wallet_address: string; solana_network: string } | null> {
  if (useMemory()) {
    return nativeAccountMemory.getPrimarySolanaWalletForAccount(accountId);
  }
  if (usePostgresDirect()) {
    return pgStore.getPrimarySolanaWalletForAccount(accountId);
  }
  const sb = persistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_account_solana_wallets")
    .select("wallet_address, solana_network")
    .eq("account_id", accountId)
    .is("revoked_at", null)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  if (!data) return null;
  return {
    wallet_address: String(data.wallet_address),
    solana_network: String(data.solana_network),
  };
}

export async function touchSolanaWalletLastUsed(
  walletAddress: string,
  solanaNetwork: string,
): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.touchSolanaWallet(walletAddress, solanaNetwork);
    return;
  }
  if (usePostgresDirect()) {
    await pgStore.touchSolanaWalletLastUsed(walletAddress, solanaNetwork);
    return;
  }
  const sb = persistenceAdmin();
  const { error } = await sb
    .from("abraxas_account_solana_wallets")
    .update({ last_used_at: new Date().toISOString() })
    .eq("wallet_address", walletAddress)
    .eq("solana_network", solanaNetwork)
    .is("revoked_at", null);
  if (error && error.code !== "42P01") throw error;
}
