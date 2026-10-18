// FILE: lib/auth/nativeAccount/accountSessionStore.ts

import { randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import { nativeAccountMemoryStoreEnabled } from "./featureFlag";
import { nativeAccountMemory } from "./memoryStore";
import type { AccountAuthMethod } from "@/lib/auth/accountSession";
import { NativeAccountStoreUnavailableError } from "./storeErrors";
import * as pgStore from "./postgresDirectStore";

export type AccountSessionRevokeReason =
  | "sign_out"
  | "compromised"
  | "account_suspended"
  | "credential_revoked"
  | "expired";

export function createAccountSessionId(): string {
  return `acs_${randomBytes(16).toString("hex")}`;
}

function useMemory(): boolean {
  return nativeAccountMemoryStoreEnabled();
}

function usePostgresDirect(): boolean {
  return !useMemory() && isNativeAccountDirectPostgresEnabled();
}

export async function insertAccountSessionRecord(input: {
  sessionId: string;
  accountId: string;
  authMethod: AccountAuthMethod;
  expiresAt: string;
}): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.insertAccountSession({
      session_id: input.sessionId,
      account_id: input.accountId,
      auth_method: input.authMethod,
      expires_at: input.expiresAt,
    });
    return;
  }
  if (usePostgresDirect()) {
    await pgStore.insertAccountSessionRecord(input);
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_account_sessions").insert({
    session_id: input.sessionId,
    account_id: input.accountId,
    auth_method: input.authMethod,
    expires_at: input.expiresAt,
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function isAccountSessionActive(input: {
  sessionId: string;
  accountId: string;
}): Promise<boolean> {
  if (useMemory()) {
    return nativeAccountMemory.isAccountSessionActive(input.sessionId, input.accountId);
  }
  if (usePostgresDirect()) {
    return pgStore.isAccountSessionActive(input);
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb.rpc("abraxas_validate_account_session", {
    p_session_id: input.sessionId,
    p_account_id: input.accountId,
  });
  if (error) {
    if (error.code === "42883" || error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return Boolean(data);
}

export async function revokeAccountSession(input: {
  sessionId: string;
  accountId: string;
  reason: AccountSessionRevokeReason;
}): Promise<boolean> {
  if (useMemory()) {
    return nativeAccountMemory.revokeAccountSession(input.sessionId, input.accountId, input.reason);
  }
  if (usePostgresDirect()) {
    return pgStore.revokeAccountSession(input);
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb.rpc("abraxas_revoke_account_session", {
    p_session_id: input.sessionId,
    p_account_id: input.accountId,
    p_reason: input.reason,
  });
  if (error) {
    if (error.code === "42883" || error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return Boolean(data);
}

export async function revokeAllAccountSessions(
  accountId: string,
  reason: AccountSessionRevokeReason,
): Promise<number> {
  if (useMemory()) {
    return nativeAccountMemory.revokeAllAccountSessions(accountId, reason);
  }
  if (usePostgresDirect()) {
    return pgStore.revokeAllAccountSessions(accountId, reason);
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_account_sessions")
    .update({ revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq("account_id", accountId)
    .is("revoked_at", null)
    .select("session_id");
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return (data ?? []).length;
}
