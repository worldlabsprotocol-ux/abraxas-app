// FILE: lib/auth/nativeAccount/nativeAccountPersistence.ts
// Routes native account stores to memory, direct PostgreSQL, or legacy PostgREST.

import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import { isSovereignNativeAccountMode } from "@/lib/persistence/sovereignNativeAccount";
import { nativeAccountMemoryStoreEnabled } from "./featureFlag";
import { NativeAccountStoreUnavailableError } from "./storeErrors";

export function nativeAccountUsesMemory(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return nativeAccountMemoryStoreEnabled(env);
}

export function nativeAccountUsesDirectPostgres(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return !nativeAccountUsesMemory(env) && isNativeAccountDirectPostgresEnabled(env);
}

export function nativeAccountUsesPostgrest(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (nativeAccountUsesMemory(env)) return false;
  if (nativeAccountUsesDirectPostgres(env)) return false;
  if (isSovereignNativeAccountMode(env)) return false;
  return true;
}

/** Sovereign mode requires direct PostgreSQL — never fall back to Supabase PostgREST. */
export function assertNativeAccountPersistenceBackend(
  env: Record<string, string | undefined> = process.env,
): void {
  if (nativeAccountUsesMemory(env) || nativeAccountUsesDirectPostgres(env)) return;
  if (isSovereignNativeAccountMode(env)) {
    throw new NativeAccountStoreUnavailableError();
  }
}
