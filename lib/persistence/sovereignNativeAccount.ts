// FILE: lib/persistence/sovereignNativeAccount.ts
// Sovereign Solana account path — direct PostgreSQL only (no Supabase PostgREST fallback).

import { persistenceUsesDirectPostgres, resolveIndependentPostgresUrl } from "./env";

export const SOVEREIGN_NATIVE_ACCOUNT_ENV = "ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT" as const;

export function sovereignNativeAccountExplicitlyEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[SOVEREIGN_NATIVE_ACCOUNT_ENV]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "enabled";
}

/** Native account auth must use Abraxas-operated PostgreSQL, not Supabase PostgREST. */
export function isSovereignNativeAccountMode(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (sovereignNativeAccountExplicitlyEnabled(env)) return true;
  return persistenceUsesDirectPostgres(env);
}

export type SovereignDatabaseValidation =
  | { ok: true }
  | { ok: false; code: "database_url_missing" | "supabase_host_rejected" };

/** Fail closed when sovereign mode targets Supabase-hosted Postgres URLs. */
export function validateSovereignNativeAccountDatabase(
  env: Record<string, string | undefined> = process.env,
): SovereignDatabaseValidation {
  if (!isSovereignNativeAccountMode(env)) return { ok: true };
  const url = resolveIndependentPostgresUrl(env)
    ?? env.ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL?.trim()
    ?? null;
  if (!url) return { ok: false, code: "database_url_missing" };
  try {
    const host = new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).hostname.toLowerCase();
    if (host.endsWith(".supabase.co") || host === "supabase.co") {
      return { ok: false, code: "supabase_host_rejected" };
    }
  } catch {
    // pg connection strings may omit URL form — allow non-URL strings for local sockets
  }
  return { ok: true };
}
