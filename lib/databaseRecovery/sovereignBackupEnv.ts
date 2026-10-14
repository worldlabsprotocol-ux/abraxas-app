// FILE: lib/databaseRecovery/sovereignBackupEnv.ts
// Wire Build #552 backup to Abraxas-operated Postgres (non-Supabase URL).

import { resolveIndependentPostgresUrl } from "@/lib/persistence/env";

/** When backing up sovereign PG, use ABRAXAS_DATABASE_URL and label identity in manifest. */
export function resolveSovereignBackupDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.ABRAXAS_BACKUP_SCOPE?.trim() !== "sovereign") return null;
  return resolveIndependentPostgresUrl(env);
}
