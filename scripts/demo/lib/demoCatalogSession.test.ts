import { describe, expect, it } from "vitest";
import {
  getControlQuery,
  listCatalogControlAllowlist,
  listCatalogSelectAllowlist,
} from "./demoCatalogQueryRegistry";
import {
  CatalogSessionError,
  rejectDynamicCatalogSql,
  runCatalogReadOnlySession,
  safeCatalogSessionDetail,
  type CatalogPgClientFactory,
} from "./demoCatalogSession";

const CONTROL_SEQUENCE_BEFORE_CATALOG = [
  "begin_read_only",
  "set_local_statement_timeout",
  "set_local_lock_timeout",
  "set_local_idle_in_transaction_session_timeout",
  "verify_transaction_read_only",
  "target_database_identity",
] as const;

function controlSql(id: (typeof CONTROL_SEQUENCE_BEFORE_CATALOG)[number]): string {
  return getControlQuery(id).sql.trim();
}

function makeConfigurableMockFactory(options: {
  onQuery?: (sql: string) => void | { rows: Record<string, unknown>[] } | Promise<void | { rows: Record<string, unknown>[] }>;
  onEnd?: () => void | Promise<void>;
} = {}): {
  factory: CatalogPgClientFactory;
  queries: string[];
  ended: boolean;
} {
  const queries: string[] = [];
  let ended = false;

  const factory: CatalogPgClientFactory = async () => ({
    async query(sql: string) {
      queries.push(sql.trim());
      const outcome = await options.onQuery?.(sql.trim());
      if (outcome && "rows" in outcome) {
        return outcome;
      }
      if (sql.includes("verify_transaction_read_only") || sql.includes("transaction_read_only")) {
        return { rows: [{ read_only: true }] };
      }
      if (sql.includes("target_database_identity") || sql.includes("current_database")) {
        return { rows: [{ matches_expected: true }] };
      }
      if (sql.trim().toUpperCase().startsWith("SELECT EXISTS")) {
        return { rows: [{ exists: true, installed: true, executable: true }] };
      }
      return { rows: [] };
    },
    async end() {
      ended = true;
      await options.onEnd?.();
    },
  });

  return {
    factory,
    get queries() {
      return queries;
    },
    get ended() {
      return ended;
    },
  };
}

describe("demoCatalogSession", () => {
  it("executes control sequence before catalog queries", async () => {
    const mock = makeConfigurableMockFactory();

    await runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    });

    for (let i = 0; i < CONTROL_SEQUENCE_BEFORE_CATALOG.length; i += 1) {
      expect(mock.queries[i]).toBe(controlSql(CONTROL_SEQUENCE_BEFORE_CATALOG[i]));
    }
    expect(mock.queries.at(-1)).toBe(getControlQuery("rollback").sql.trim());
    expect(mock.ended).toBe(true);
  });

  it("rolls back and closes the connection on success", async () => {
    const mock = makeConfigurableMockFactory();

    await runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async () => "ok",
    });

    expect(mock.queries.at(-1)).toBe(getControlQuery("rollback").sql.trim());
    expect(mock.ended).toBe(true);
  });

  it("rolls back and closes the connection on catalog-query failure", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql.includes("pg_extension")) {
          throw new Error("sensitive pg error");
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({
      code: "catalog_query_failed",
      message: safeCatalogSessionDetail("catalog_query_failed"),
    });

    expect(mock.queries.at(-1)).toBe(getControlQuery("rollback").sql.trim());
    expect(mock.ended).toBe(true);
  });

  it("fails with begin_failed and runs no catalog queries", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql === controlSql("begin_read_only")) {
          throw new Error("begin failed");
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({ code: "begin_failed" });

    expect(mock.queries.some((sql) => sql.includes("pg_extension"))).toBe(false);
    expect(mock.ended).toBe(true);
  });

  it("fails with timeout_failed and runs no catalog queries", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql === controlSql("set_local_lock_timeout")) {
          throw new Error("timeout failed");
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({ code: "timeout_failed" });

    expect(mock.queries.some((sql) => sql.includes("pg_extension"))).toBe(false);
  });

  it("fails with read_only_verification_failed and runs no catalog queries", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql.includes("transaction_read_only")) {
          return { rows: [{ read_only: false }] };
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({ code: "read_only_verification_failed" });

    expect(mock.queries.some((sql) => sql.includes("pg_extension"))).toBe(false);
  });

  it("fails with target_database_failed and runs no catalog queries", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql.includes("current_database")) {
          return { rows: [{ matches_expected: false }] };
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({ code: "target_database_failed" });

    expect(mock.queries.some((sql) => sql.includes("pg_extension"))).toBe(false);
  });

  it("retains catalog_query_failed when rollback also fails", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql.includes("pg_extension")) {
          throw new Error("catalog failed");
        }
        if (sql === getControlQuery("rollback").sql.trim()) {
          throw new Error("rollback failed");
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({ code: "catalog_query_failed" });
  });

  it("surfaces rollback_failed when rollback fails without a prior session error", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql === getControlQuery("rollback").sql.trim()) {
          throw new Error("rollback failed");
        }
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async () => "ok",
    })).rejects.toMatchObject({ code: "rollback_failed" });
  });

  it("surfaces client_end_failed when end fails without a prior session error", async () => {
    const mock = makeConfigurableMockFactory({
      onEnd() {
        throw new Error("end failed");
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async () => "ok",
    })).rejects.toMatchObject({ code: "client_end_failed" });
  });

  it("retains primary session error when client.end also fails", async () => {
    const mock = makeConfigurableMockFactory({
      onQuery(sql) {
        if (sql.includes("pg_extension")) {
          throw new Error("catalog failed");
        }
      },
      onEnd() {
        throw new Error("end failed");
      },
    });

    await expect(runCatalogReadOnlySession({
      databaseUrl: "postgresql://postgres:pw@db.demo-ref.supabase.co:5432/postgres",
      env: {},
      createPgClient: mock.factory,
      execute: async ({ runCatalogQuery }) => {
        await runCatalogQuery("pgcrypto_installed");
      },
    })).rejects.toMatchObject({ code: "catalog_query_failed" });
  });

  it("rejects non-allowlisted SQL at execution time", () => {
    expect(() => rejectDynamicCatalogSql("DELETE FROM partners")).toThrow(/Rejected SQL pattern/i);
  });

  it("uses hardcoded timeout values in control registry", () => {
    const controls = listCatalogControlAllowlist();
    expect(controls.find((entry) => entry.id === "set_local_statement_timeout")?.sql).toContain("30s");
    expect(controls.find((entry) => entry.id === "set_local_lock_timeout")?.sql).toContain("5s");
    expect(controls.find((entry) => entry.id === "set_local_idle_in_transaction_session_timeout")?.sql)
      .toContain("30s");
  });

  it("keeps catalog entries SELECT-only", () => {
    for (const entry of listCatalogSelectAllowlist()) {
      expect(entry.sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    }
  });

  it("does not leak raw errors from CatalogSessionError", () => {
    const error = new CatalogSessionError("catalog_query_failed", safeCatalogSessionDetail("catalog_query_failed"));
    expect(error.message).not.toContain("password");
    expect(error.message).not.toContain("postgresql://");
  });
});
