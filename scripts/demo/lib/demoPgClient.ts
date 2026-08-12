// FILE: scripts/demo/lib/demoPgClient.ts
// Postgres client factory for demo migration apply mode only.

import { parseDemoDatabaseUrl } from "./demoDatabaseUrl";
import type { DatabaseExecutor } from "./demoDatabaseLedger";

export async function createDemoPgClient(databaseUrl: string): Promise<DatabaseExecutor> {
  const parsed = parseDemoDatabaseUrl(databaseUrl);
  const pg = await import("pg");
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl:
      parsed.transport === "supabase_session_pooler"
        ? { rejectUnauthorized: true }
        : undefined,
  });
  await client.connect();

  const executor: DatabaseExecutor = {
    async query<T = unknown>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[] };
    },
    async withTransaction<T>(fn: (tx: DatabaseExecutor) => Promise<T>) {
      await client.query("BEGIN");
      try {
        const tx: DatabaseExecutor = {
          query: executor.query.bind(executor),
          withTransaction: async (inner) => inner(tx),
          tryAdvisoryLock: executor.tryAdvisoryLock.bind(executor),
          advisoryUnlock: executor.advisoryUnlock.bind(executor),
          end: async () => undefined,
        };
        const value = await fn(tx);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    },
    async tryAdvisoryLock(lockKey: number) {
      const result = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [lockKey],
      );
      return result.rows[0]?.locked === true;
    },
    async advisoryUnlock(lockKey: number) {
      await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
    },
    async end() {
      await client.end();
    },
  };

  return executor;
}
