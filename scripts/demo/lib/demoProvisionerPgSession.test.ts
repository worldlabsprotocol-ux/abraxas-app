// FILE: scripts/demo/lib/demoProvisionerPgSession.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  runProvisionerApplySession,
  runProvisionerReadOnlySession,
} from "./demoProvisionerPgSession";

function createRecordingClient() {
  const queries: string[] = [];
  let closed = false;

  return {
    queries,
    get ended() {
      return closed;
    },
    factory: async () => ({
      async query(sql: string) {
        queries.push(sql.trim());
        if (sql.includes("pg_try_advisory_lock")) {
          return { rows: [{ locked: true }] };
        }
        if (sql.includes("transaction_read_only")) {
          return { rows: [{ read_only: true }] };
        }
        if (sql.includes("current_database()")) {
          return { rows: [{ matches_expected: true }] };
        }
        if (sql.includes("pg_advisory_unlock")) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      async end() {
        closed = true;
      },
    }),
  };
}

describe("demoProvisionerPgSession", () => {
  it("read-only session begins read-only, sets timeouts, rolls back, and closes", async () => {
    const client = createRecordingClient();
    await runProvisionerReadOnlySession({
      databaseUrl: "postgresql://postgres.demo:secret@aws-0-us.pooler.supabase.com:5432/postgres",
      env: {},
      createPgClient: client.factory,
      execute: async () => "ok",
    });

    expect(client.queries[0]).toMatch(/^BEGIN TRANSACTION READ ONLY/i);
    expect(client.queries.some((q) => q.startsWith("SET LOCAL statement_timeout"))).toBe(true);
    expect(client.queries.some((q) => q.startsWith("SET LOCAL lock_timeout"))).toBe(true);
    expect(client.queries.some((q) => q.includes("transaction_read_only"))).toBe(true);
    expect(client.queries.some((q) => /^ROLLBACK/i.test(q))).toBe(true);
    expect(client.ended).toBe(true);
  });

  it("apply session acquires lock, begins, commits before unlock and end", async () => {
    const client = createRecordingClient();
    const order: string[] = [];

    await runProvisionerApplySession({
      databaseUrl: "postgresql://postgres.demo:secret@aws-0-us.pooler.supabase.com:5432/postgres",
      env: {},
      advisoryLockKey: 42,
      createPgClient: client.factory,
      execute: async (tx) => {
        order.push("execute");
        await tx.query("SELECT 1");
        return "done";
      },
    });

    const lockIndex = client.queries.findIndex((q) => q.includes("pg_try_advisory_lock"));
    const beginIndex = client.queries.findIndex((q) => q === "BEGIN");
    const commitIndex = client.queries.findIndex((q) => q === "COMMIT");
    const unlockIndex = client.queries.findIndex((q) => q.includes("pg_advisory_unlock"));

    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(beginIndex).toBeGreaterThan(lockIndex);
    expect(order).toEqual(["execute"]);
    expect(commitIndex).toBeGreaterThan(beginIndex);
    expect(unlockIndex).toBeGreaterThan(commitIndex);
    expect(client.ended).toBe(true);
  });

  it("apply session rolls back and unlocks when execute fails", async () => {
    const client = createRecordingClient();

    await expect(
      runProvisionerApplySession({
        databaseUrl: "postgresql://postgres.demo:secret@aws-0-us.pooler.supabase.com:5432/postgres",
        env: {},
        advisoryLockKey: 42,
        createPgClient: client.factory,
        execute: async () => {
          throw new Error("mutation failed");
        },
      }),
    ).rejects.toThrow("mutation failed");

    expect(client.queries).toContain("ROLLBACK");
    expect(client.queries.some((q) => q.includes("pg_advisory_unlock"))).toBe(true);
    expect(client.ended).toBe(true);
  });

  it("apply session performs no mutation when lock is not acquired", async () => {
    const queries: string[] = [];
    let closed = false;
    const factory = async () => ({
      async query(sql: string) {
        queries.push(sql.trim());
        if (sql.includes("pg_try_advisory_lock")) {
          return { rows: [{ locked: false }] };
        }
        return { rows: [] };
      },
      async end() {
        closed = true;
      },
    });

    await expect(
      runProvisionerApplySession({
        databaseUrl: "postgresql://postgres.demo:secret@aws-0-us.pooler.supabase.com:5432/postgres",
        env: {},
        advisoryLockKey: 42,
        createPgClient: factory,
        execute: async () => {
          throw new Error("should not run");
        },
      }),
    ).rejects.toThrow("provision_lock_held");

    expect(queries).not.toContain("BEGIN");
    expect(queries).not.toContain("COMMIT");
    expect(closed).toBe(true);
  });
});
