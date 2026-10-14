// FILE: lib/databaseRecovery/pgClient.ts

import type { PgQueryable } from "./pgInventory";

function isLocalDisposableHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

/** Postgres client for disposable restore targets (localhost) or demo Supabase (backup inventory). */
export async function createRecoveryPgClient(input: {
  databaseUrl: string;
  env?: Record<string, string | undefined>;
}): Promise<PgQueryable & { end(): Promise<void> }> {
  const env = input.env ?? process.env;
  let host: string;
  try {
    host = new URL(input.databaseUrl.trim()).hostname;
  } catch {
    throw new Error("database URL is not valid");
  }

  const pg = await import("pg");

  if (isLocalDisposableHost(host)) {
    const client = new pg.Client({ connectionString: input.databaseUrl });
    await client.connect();
    return {
      async query<T = unknown>(sql: string) {
        const result = await client.query(sql);
        return { rows: result.rows as T[] };
      },
      async end() {
        await client.end();
      },
    };
  }

  const { createDemoPgClient } = await import("@/scripts/demo/lib/demoPgClient");
  return createDemoPgClient({ databaseUrl: input.databaseUrl, env });
}
