// FILE: lib/auth/nativeAccount/schemaProbePg.ts
// Direct PostgreSQL schema probes for sovereign native account persistence.

import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01";
}

export async function pgTableExists(
  tableName: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (!isNativeAccountDirectPostgresEnabled(env)) return false;
  try {
    const { rows } = await queryAbraxasPg<{ exists: boolean }>(
      `select to_regclass($1) is not null as exists`,
      [`public.${tableName}`],
      env,
    );
    return Boolean(rows[0]?.exists);
  } catch (error) {
    if (isMissingRelationError(error)) return false;
    throw error;
  }
}

export async function pgFunctionExists(
  functionName: string,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (!isNativeAccountDirectPostgresEnabled(env)) return false;
  try {
    const { rows } = await queryAbraxasPg<{ exists: boolean }>(
      `select exists (
         select 1 from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1
       ) as exists`,
      [functionName],
      env,
    );
    return Boolean(rows[0]?.exists);
  } catch (error) {
    if (isMissingRelationError(error)) return false;
    throw error;
  }
}
