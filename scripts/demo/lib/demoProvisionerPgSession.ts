// FILE: scripts/demo/lib/demoProvisionerPgSession.ts
// Guarded PostgreSQL sessions for provisioner apply (read-write) and verify (read-only).

import type { QueryResultRow } from "pg";
import { buildDemoPgClientConfig } from "./demoPgClientConfig";
import { assertNodeTlsVerificationEnabled } from "./demoSslRootCert";

export interface ProvisionerPgQueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
}

export interface ProvisionerPgExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<ProvisionerPgQueryResult<T>>;
  tryAdvisoryLock(lockKey: number): Promise<boolean>;
  advisoryUnlock(lockKey: number): Promise<void>;
}

export type ProvisionerPgClientFactory = (input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
}) => Promise<{
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
  end: () => Promise<void>;
}>;

const STATEMENT_TIMEOUT_SQL = "SET LOCAL statement_timeout = '30s'";
const LOCK_TIMEOUT_SQL = "SET LOCAL lock_timeout = '5s'";
const IDLE_TIMEOUT_SQL = "SET LOCAL idle_in_transaction_session_timeout = '30s'";

async function defaultProvisionerPgClientFactory(input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
}): Promise<{
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
  end: () => Promise<void>;
}> {
  const { clientOptions } = buildDemoPgClientConfig(input);
  const pg = await import("pg");
  const client = new pg.Client(clientOptions);
  await client.connect();

  return {
    async query(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return { rows: result.rows };
    },
    async end() {
      await client.end();
    },
  };
}

function createExecutor(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
}): ProvisionerPgExecutor {
  return {
    query: (sql, params) => client.query(sql, params),
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
  };
}

async function applySessionTimeouts(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
}): Promise<void> {
  await client.query(STATEMENT_TIMEOUT_SQL);
  await client.query(LOCK_TIMEOUT_SQL);
  await client.query(IDLE_TIMEOUT_SQL);
}

async function assertReadOnlyTransaction(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
}): Promise<void> {
  const result = await client.query<{ read_only: boolean }>(
    "SELECT current_setting('transaction_read_only') = 'on' AS read_only",
  );
  if (result.rows[0]?.read_only !== true) {
    throw new Error("Read-only transaction verification failed");
  }
}

async function assertTargetDatabase(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
}): Promise<void> {
  const result = await client.query<{ matches_expected: boolean }>(
    "SELECT current_database() = 'postgres' AS matches_expected",
  );
  if (result.rows[0]?.matches_expected !== true) {
    throw new Error("Connected database does not match expected target identity");
  }
}

export async function runProvisionerReadOnlySession<T>(input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
  createPgClient?: ProvisionerPgClientFactory;
  execute: (session: ProvisionerPgExecutor) => Promise<T>;
}): Promise<T> {
  assertNodeTlsVerificationEnabled();
  const createPgClient = input.createPgClient ?? defaultProvisionerPgClientFactory;
  const client = await createPgClient({
    databaseUrl: input.databaseUrl,
    env: input.env,
  });

  let transactionStarted = false;
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    transactionStarted = true;
    await applySessionTimeouts(client);
    await assertReadOnlyTransaction(client);
    await assertTargetDatabase(client);

    const result = await input.execute(createExecutor(client));
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // preserve primary error
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

export async function runProvisionerApplySession<T>(input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
  advisoryLockKey: number;
  createPgClient?: ProvisionerPgClientFactory;
  execute: (session: ProvisionerPgExecutor) => Promise<T>;
}): Promise<T> {
  assertNodeTlsVerificationEnabled();
  const createPgClient = input.createPgClient ?? defaultProvisionerPgClientFactory;
  const client = await createPgClient({
    databaseUrl: input.databaseUrl,
    env: input.env,
  });

  const executor = createExecutor(client);
  let transactionStarted = false;
  let lockHeld = false;

  try {
    const locked = await executor.tryAdvisoryLock(input.advisoryLockKey);
    if (!locked) {
      throw new Error("provision_lock_held");
    }
    lockHeld = true;

    await client.query("BEGIN");
    transactionStarted = true;
    await applySessionTimeouts(client);
    await assertTargetDatabase(client);

    const result = await input.execute(executor);
    await client.query("COMMIT");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // preserve primary error
      }
    }
    throw error;
  } finally {
    if (lockHeld) {
      try {
        await executor.advisoryUnlock(input.advisoryLockKey);
      } catch {
        // ignore unlock errors
      }
    }
    await client.end();
  }
}
