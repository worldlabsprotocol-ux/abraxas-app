// FILE: scripts/demo/lib/demoCatalogSession.ts
// Read-only PostgreSQL session for catalog validation.

import type { QueryResultRow } from "pg";
import { buildDemoPgClientConfig } from "./demoPgClientConfig";
import {
  assertCatalogSelectSqlIsAllowlisted,
  assertControlSqlIsAllowlisted,
  assertRejectedUserSuppliedSql,
  getCatalogSelectQuery,
  getControlQuery,
  type DemoCatalogControlQueryId,
  type DemoCatalogSelectQueryId,
} from "./demoCatalogQueryRegistry";
import { assertNodeTlsVerificationEnabled } from "./demoSslRootCert";

export interface CatalogQueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
}

export interface CatalogReadOnlySession {
  executedControlQueryIds: readonly DemoCatalogControlQueryId[];
  executedCatalogQueryIds: readonly DemoCatalogSelectQueryId[];
}

export type CatalogSessionErrorCode =
  | "begin_failed"
  | "timeout_failed"
  | "read_only_verification_failed"
  | "target_database_failed"
  | "catalog_query_failed"
  | "rollback_failed"
  | "client_end_failed";

export class CatalogSessionError extends Error {
  readonly code: CatalogSessionErrorCode;

  constructor(code: CatalogSessionErrorCode, safeDetail: string) {
    super(safeDetail);
    this.name = "CatalogSessionError";
    this.code = code;
  }
}

export type CatalogPgClientFactory = (input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
}) => Promise<{
  query: (sql: string) => Promise<{ rows: QueryResultRow[] }>;
  end: () => Promise<void>;
}>;

interface ReadOnlyVerificationRow {
  read_only: boolean;
}

interface TargetDatabaseRow {
  matches_expected: boolean;
}

function controlFailureCode(queryId: DemoCatalogControlQueryId): CatalogSessionErrorCode {
  if (queryId === "begin_read_only") return "begin_failed";
  if (queryId === "verify_transaction_read_only") return "read_only_verification_failed";
  if (queryId === "target_database_identity") return "target_database_failed";
  if (queryId.startsWith("set_local_")) return "timeout_failed";
  return "rollback_failed";
}

export function safeCatalogSessionDetail(code: CatalogSessionErrorCode): string {
  switch (code) {
    case "begin_failed":
      return "Failed to start read-only transaction";
    case "timeout_failed":
      return "Failed to apply catalog session timeouts";
    case "read_only_verification_failed":
      return "Read-only verification failed before catalog probes";
    case "target_database_failed":
      return "Connected database does not match expected target identity";
    case "catalog_query_failed":
      return "Catalog probe failed";
    case "rollback_failed":
      return "Failed to rollback read-only transaction";
    case "client_end_failed":
      return "Failed to close catalog database client";
    default:
      return "Catalog session failed";
  }
}

function toCatalogSessionError(error: unknown): CatalogSessionError {
  if (error instanceof CatalogSessionError) {
    return error;
  }
  return new CatalogSessionError("catalog_query_failed", safeCatalogSessionDetail("catalog_query_failed"));
}

function assertAllowlistedSessionSql(sql: string): void {
  try {
    assertControlSqlIsAllowlisted(sql);
  } catch {
    assertCatalogSelectSqlIsAllowlisted(sql);
  }
}

export async function runCatalogReadOnlySession<T>(input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
  createPgClient?: CatalogPgClientFactory;
  execute: (session: {
    runCatalogQuery: <R extends QueryResultRow>(
      queryId: DemoCatalogSelectQueryId,
    ) => Promise<CatalogQueryResult<R>>;
    executedCatalogQueryIds: () => readonly DemoCatalogSelectQueryId[];
  }) => Promise<T>;
}): Promise<{ result: T; session: CatalogReadOnlySession }> {
  assertNodeTlsVerificationEnabled();

  const createPgClient = input.createPgClient ?? defaultCatalogPgClientFactory;
  let client: Awaited<ReturnType<CatalogPgClientFactory>> | undefined;
  let primaryError: CatalogSessionError | undefined;

  try {
    client = await createPgClient({
      databaseUrl: input.databaseUrl,
      env: input.env,
    });

    const executedControlQueryIds: DemoCatalogControlQueryId[] = [];
    const executedCatalogQueryIds: DemoCatalogSelectQueryId[] = [];
    let transactionStarted = false;
    let sessionFailure: CatalogSessionError | undefined;
    let sessionResult: { result: T; session: CatalogReadOnlySession } | undefined;

    const runControlQuery = async <R extends QueryResultRow>(
      queryId: DemoCatalogControlQueryId,
    ): Promise<CatalogQueryResult<R>> => {
      const definition = getControlQuery(queryId);
      assertControlSqlIsAllowlisted(definition.sql);
      executedControlQueryIds.push(queryId);
      try {
        const result = await client!.query(definition.sql);
        return { rows: result.rows as R[] };
      } catch {
        const code = controlFailureCode(queryId);
        throw new CatalogSessionError(code, safeCatalogSessionDetail(code));
      }
    };

    const runCatalogQuery = async <R extends QueryResultRow>(
      queryId: DemoCatalogSelectQueryId,
    ): Promise<CatalogQueryResult<R>> => {
      const definition = getCatalogSelectQuery(queryId);
      assertCatalogSelectSqlIsAllowlisted(definition.sql);
      executedCatalogQueryIds.push(queryId);
      try {
        const result = await client!.query(definition.sql);
        return { rows: result.rows as R[] };
      } catch {
        throw new CatalogSessionError(
          "catalog_query_failed",
          safeCatalogSessionDetail("catalog_query_failed"),
        );
      }
    };

    try {
      await runControlQuery("begin_read_only");
      transactionStarted = true;

      await runControlQuery("set_local_statement_timeout");
      await runControlQuery("set_local_lock_timeout");
      await runControlQuery("set_local_idle_in_transaction_session_timeout");

      const readOnly = await runControlQuery<ReadOnlyVerificationRow>("verify_transaction_read_only");
      if (readOnly.rows[0]?.read_only !== true) {
        throw new CatalogSessionError(
          "read_only_verification_failed",
          safeCatalogSessionDetail("read_only_verification_failed"),
        );
      }

      const targetDatabase = await runControlQuery<TargetDatabaseRow>("target_database_identity");
      if (targetDatabase.rows[0]?.matches_expected !== true) {
        throw new CatalogSessionError(
          "target_database_failed",
          safeCatalogSessionDetail("target_database_failed"),
        );
      }

      const result = await input.execute({
        runCatalogQuery,
        executedCatalogQueryIds: () => [...executedCatalogQueryIds],
      });

      sessionResult = {
        result,
        session: {
          executedControlQueryIds: [...executedControlQueryIds],
          executedCatalogQueryIds: [...executedCatalogQueryIds],
        },
      };
    } catch (error) {
      sessionFailure = toCatalogSessionError(error);
    } finally {
      if (transactionStarted) {
        try {
          const definition = getControlQuery("rollback");
          assertControlSqlIsAllowlisted(definition.sql);
          executedControlQueryIds.push("rollback");
          await client!.query(definition.sql);
        } catch {
          if (!sessionFailure) {
            sessionFailure = new CatalogSessionError(
              "rollback_failed",
              safeCatalogSessionDetail("rollback_failed"),
            );
          }
        }
      }
    }

    if (sessionFailure) {
      primaryError = sessionFailure;
      throw sessionFailure;
    }

    return sessionResult!;
  } catch (error) {
    primaryError = primaryError ?? toCatalogSessionError(error);
    throw primaryError;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        if (!primaryError) {
          primaryError = new CatalogSessionError(
            "client_end_failed",
            safeCatalogSessionDetail("client_end_failed"),
          );
          throw primaryError;
        }
      }
    }
  }
}

async function defaultCatalogPgClientFactory(input: {
  databaseUrl: string;
  env: Record<string, string | undefined>;
}): Promise<{
  query: (sql: string) => Promise<{ rows: QueryResultRow[] }>;
  end: () => Promise<void>;
}> {
  const { clientOptions } = buildDemoPgClientConfig(input);
  const pg = await import("pg");
  const client = new pg.Client(clientOptions);
  await client.connect();

  return {
    async query(sql: string) {
      assertAllowlistedSessionSql(sql);
      const result = await client.query(sql);
      return { rows: result.rows };
    },
    async end() {
      await client.end();
    },
  };
}

export function rejectDynamicCatalogSql(sql: string): void {
  assertRejectedUserSuppliedSql(sql);
  try {
    assertControlSqlIsAllowlisted(sql);
  } catch {
    assertCatalogSelectSqlIsAllowlisted(sql);
  }
}
