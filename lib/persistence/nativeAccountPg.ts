// FILE: lib/persistence/nativeAccountPg.ts
// Direct PostgreSQL transport for native account stores (provider-neutral wire protocol).

import {
  persistenceUsesDirectPostgres,
  resolveIndependentPostgresUrl,
} from "./env";
import { isSovereignNativeAccountMode } from "./sovereignNativeAccount";

export const NATIVE_ACCOUNT_PG_ENV = "ABRAXAS_NATIVE_ACCOUNT_PG" as const;

export function nativeAccountPgExplicitlyEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[NATIVE_ACCOUNT_PG_ENV]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "enabled";
}

/** Direct Postgres URL for native account path — may target Supabase pooler or self-hosted Postgres. */
export function resolveNativeAccountDirectPostgresUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const explicit =
    env.ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL?.trim()
    ?? env.ABRAXAS_DATABASE_URL?.trim()
    ?? null;
  if (explicit) return explicit;
  if (persistenceUsesDirectPostgres(env)) {
    return resolveIndependentPostgresUrl(env);
  }
  return null;
}

export function isNativeAccountDirectPostgresEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const sovereign = isSovereignNativeAccountMode(env);
  if (env.NODE_ENV === "test" && env.VITEST === "true" && !nativeAccountPgExplicitlyEnabled(env) && !sovereign) {
    return false;
  }
  if (persistenceUsesDirectPostgres(env) || sovereign) {
    return Boolean(resolveNativeAccountDirectPostgresUrl(env));
  }
  if (!nativeAccountPgExplicitlyEnabled(env)) return false;
  return Boolean(resolveNativeAccountDirectPostgresUrl(env));
}
