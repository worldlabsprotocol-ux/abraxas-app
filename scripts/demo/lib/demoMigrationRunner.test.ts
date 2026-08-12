import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertApplyConfirmation,
  assertMigrationContentMatchesPlan,
  assertMigrationFileAllowed,
  applyDemoMigrations,
  buildDryRunReport,
  formatDryRunReport,
  loadRequiredMigrationPlan,
  validateApplyDemoMigrationConfig,
  validateDryRunDemoMigrationConfig,
} from "./demoMigrationRunner";
import {
  parseSupabaseProjectRefFromDatabaseUrl,
  redactDatabaseSecrets,
} from "./demoDatabaseUrl";
import {
  assertDatabaseLedgerCompatible,
  insertDatabaseLedgerRow,
  type DatabaseExecutor,
  type DatabaseLedgerRow,
} from "./demoDatabaseLedger";
import { DEMO_OPS_LEDGER_INIT_SQL } from "./demoOpsSchema";
import { DEMO_REQUIRED_MIGRATION_ORDER, DEMO_EXCLUDED_MIGRATIONS } from "./demoMigrationManifest";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "./knownProductionSupabaseProjectRefs";
import { hashMigrationContent } from "./demoMigrationLedger";
import {
  DEMO_MIGRATION_055_FILENAME,
  normalize055MigrationForAtomicExecution,
} from "./demoMigration055Normalization";

const DEMO_REF = "ocntwbxarpjeixdnzide";
const PROD_REF = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS[0];
const DEMO_DB_URL = `postgresql://postgres:plain-secret@db.${DEMO_REF}.supabase.co:5432/postgres`;
const DEMO_POOLER_URL = `postgresql://postgres.${DEMO_REF}:plain-secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
const DEMO_SSL_CERT_PATH = "/operator/local-only/supabase-ca.pem";
const ENCODED_DB_URL = `postgresql://postgres:${encodeURIComponent("p@ss:word")}@db.${DEMO_REF}.supabase.co:5432/postgres`;

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DEMO_SUPABASE_PROJECT_REF: DEMO_REF,
    PRODUCTION_SUPABASE_PROJECT_REF: PROD_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_REF}.supabase.co`,
    DEMO_SUPABASE_DATABASE_URL: DEMO_DB_URL,
    ...overrides,
  };
}

type LedgerStore = Map<string, DatabaseLedgerRow>;

function createMockDatabase(options?: {
  locked?: boolean;
  failOnQuery?: (sql: string, callIndex: number) => void;
}) {
  const ledger: LedgerStore = new Map();
  let inTransaction = false;
  let lockHeld = false;
  let queryCount = 0;
  let ended = false;

  const executor: DatabaseExecutor = {
    async query<T = unknown>(sql: string, params: unknown[] = []) {
      queryCount += 1;
      options?.failOnQuery?.(sql, queryCount);

      if (sql === DEMO_OPS_LEDGER_INIT_SQL) {
        return { rows: [] as T[] };
      }

      if (sql.includes("FROM demo_ops.migration_ledger") && params[0]) {
        const row = ledger.get(String(params[0]));
        return { rows: (row ? [row] : []) as T[] };
      }

      if (sql.includes("INSERT INTO demo_ops.migration_ledger")) {
        const [filename, sha256, runnerVersion, appliedAt] = params as [
          string,
          string,
          string,
          string | null,
        ];
        if (ledger.has(filename)) {
          return { rows: [] as T[] };
        }
        const row: DatabaseLedgerRow = {
          filename,
          sha256,
          applied_at: appliedAt ?? new Date().toISOString(),
          runner_version: runnerVersion,
        };
        ledger.set(filename, row);
        return { rows: [row] as T[] };
      }

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] as T[] };
      }

      if (sql.includes("pg_try_advisory_lock")) {
        if (options?.locked) return { rows: [{ locked: false }] as T[] };
        lockHeld = true;
        return { rows: [{ locked: true }] as T[] };
      }

      if (sql.includes("pg_advisory_unlock")) {
        lockHeld = false;
        return { rows: [] as T[] };
      }

      return { rows: [] as T[] };
    },
    async withTransaction<T>(fn: (tx: DatabaseExecutor) => Promise<T>) {
      inTransaction = true;
      try {
        await executor.query("BEGIN");
        const value = await fn(executor);
        await executor.query("COMMIT");
        inTransaction = false;
        return value;
      } catch (error) {
        await executor.query("ROLLBACK");
        inTransaction = false;
        throw error;
      }
    },
    async tryAdvisoryLock() {
      if (options?.locked) return false;
      lockHeld = true;
      return true;
    },
    async advisoryUnlock() {
      lockHeld = false;
    },
    async end() {
      ended = true;
    },
  };

  return {
    executor,
    ledger,
    get state() {
      return { inTransaction, lockHeld, ended, queryCount };
    },
  };
}

describe("demo denylist and reference checks", () => {
  it("confirms the supplied demo ref differs from production and is absent from the immutable denylist", () => {
    expect(DEMO_REF).not.toBe(PROD_REF);
    expect(KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS).not.toContain(DEMO_REF);
    expect(KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS).toContain(PROD_REF);
  });

  it("rejects production demo ref before pool/client construction", async () => {
    expect(() =>
      validateApplyDemoMigrationConfig(
        baseEnv({
          DEMO_SUPABASE_PROJECT_REF: PROD_REF,
          NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
          DEMO_SUPABASE_DATABASE_URL: `postgresql://postgres:secret@db.${PROD_REF}.supabase.co:5432/postgres`,
        }),
      ),
    ).toThrow(/denied|must not equal/i);

    let createCalled = false;
    await expect(
      (async () => {
        const config = validateApplyDemoMigrationConfig(
          baseEnv({
            DEMO_SUPABASE_PROJECT_REF: PROD_REF,
            NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
            DEMO_SUPABASE_DATABASE_URL: `postgresql://postgres:secret@db.${PROD_REF}.supabase.co:5432/postgres`,
          }),
        );
        await applyDemoMigrations({
          config,
          confirmation: PROD_REF,
          env: baseEnv(),
          createClient: async () => {
            createCalled = true;
            throw new Error("should not connect");
          },
        });
      })(),
    ).rejects.toThrow();

    expect(createCalled).toBe(false);
  });

  it("rejects mismatched REST URL and demo ref", () => {
    expect(() =>
      validateDryRunDemoMigrationConfig(
        baseEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://other-ref.supabase.co",
        }),
      ),
    ).toThrow(/does not match DEMO_SUPABASE_PROJECT_REF/i);
  });

  it("rejects mismatched database URL and demo ref", () => {
    expect(() =>
      validateApplyDemoMigrationConfig(
        baseEnv({
          DEMO_SUPABASE_DATABASE_URL: "postgresql://postgres:secret@db.other-ref.supabase.co:5432/postgres",
        }),
      ),
    ).toThrow(/does not match DEMO_SUPABASE_PROJECT_REF/i);
  });

  it("rejects transaction pooler port 6543 and unbound pooler usernames", () => {
    expect(() =>
      parseSupabaseProjectRefFromDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      ),
    ).toThrow(/6543|transaction pooler/i);

    expect(() =>
      parseSupabaseProjectRefFromDatabaseUrl(
        `postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      ),
    ).toThrow(/username postgres\.<demo-project-ref>/i);
  });

  it("accepts official session pooler URLs for apply validation when CA path is configured", () => {
    const config = validateApplyDemoMigrationConfig(
      baseEnv({
        DEMO_SUPABASE_DATABASE_URL: DEMO_POOLER_URL,
        DEMO_SUPABASE_SSL_ROOT_CERT_PATH: DEMO_SSL_CERT_PATH,
      }),
    );
    expect(config.databaseTransport).toBe("supabase_session_pooler");
    expect(config.maskedDatabaseTarget).toBe(
      "transport=supabase_session_pooler project=ocnt…zide",
    );
  });

  it("requires DEMO_SUPABASE_SSL_ROOT_CERT_PATH for session pooler apply validation", () => {
    expect(() =>
      validateApplyDemoMigrationConfig(
        baseEnv({ DEMO_SUPABASE_DATABASE_URL: DEMO_POOLER_URL }),
      ),
    ).toThrow(/DEMO_SUPABASE_SSL_ROOT_CERT_PATH is required/i);
  });

  it("rejects production pooler config before SSL root certificate loading", () => {
    expect(() =>
      validateApplyDemoMigrationConfig(
        baseEnv({
          DEMO_SUPABASE_PROJECT_REF: PROD_REF,
          NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
          DEMO_SUPABASE_DATABASE_URL: `postgresql://postgres.${PROD_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
          DEMO_SUPABASE_SSL_ROOT_CERT_PATH: DEMO_SSL_CERT_PATH,
        }),
      ),
    ).toThrow(/production|denied|must not equal/i);
  });

  it("retains advisory lock behavior on a single session for session pooler transport", async () => {
    let migrationSqlSeen = 0;
    const mock = createMockDatabase({
      failOnQuery: (sql) => {
        if (
          !sql.includes("demo_ops") &&
          !sql.includes("advisory") &&
          sql !== "BEGIN" &&
          sql !== "COMMIT" &&
          sql !== "ROLLBACK"
        ) {
          migrationSqlSeen += 1;
          if (migrationSqlSeen > 1) {
            throw new Error("stop on first migration error");
          }
        }
      },
    });
    const config = validateApplyDemoMigrationConfig(
      baseEnv({
        DEMO_SUPABASE_DATABASE_URL: DEMO_POOLER_URL,
        DEMO_SUPABASE_SSL_ROOT_CERT_PATH: DEMO_SSL_CERT_PATH,
      }),
    );

    await expect(
      applyDemoMigrations({
        config,
        confirmation: DEMO_REF,
        env: baseEnv({
          DEMO_SUPABASE_DATABASE_URL: DEMO_POOLER_URL,
          DEMO_SUPABASE_SSL_ROOT_CERT_PATH: DEMO_SSL_CERT_PATH,
        }),
        createClient: async () => mock.executor,
      }),
    ).rejects.toThrow(/stop on first migration error/i);

    expect(mock.state.lockHeld).toBe(false);
    expect(mock.state.ended).toBe(true);
    expect(config.databaseTransport).toBe("supabase_session_pooler");
  });
});

describe("demoMigrationRunner manifest scope", () => {
  it("loads exactly the approved 18-file order", () => {
    const plan = loadRequiredMigrationPlan();
    expect(plan).toHaveLength(18);
    expect(plan.map((entry) => entry.file)).toEqual([...DEMO_REQUIRED_MIGRATION_ORDER]);
  });

  it("rejects excluded and out-of-manifest migrations", () => {
    for (const file of DEMO_EXCLUDED_MIGRATIONS) {
      expect(() => assertMigrationFileAllowed(file)).toThrow(/excluded/i);
    }
    expect(() => assertMigrationFileAllowed("045_verification_layer_production_seed.sql")).toThrow(
      /outside the approved demo manifest/i,
    );
  });

  it("dry-run is fully offline and performs no database work", () => {
    const config = validateDryRunDemoMigrationConfig({
      DEMO_SUPABASE_PROJECT_REF: DEMO_REF,
      PRODUCTION_SUPABASE_PROJECT_REF: PROD_REF,
      NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_REF}.supabase.co`,
    });
    expect(config.maskedDatabaseTarget).toBe("transport=unresolved project=ocnt…zide");
    const report = buildDryRunReport(config);
    const output = formatDryRunReport(report);
    expect(output).toContain("DRY RUN");
    expect(output).toContain("Approved manifest (18 files)");
    expect(output).toContain("No DNS lookup");
    expect(output).not.toContain(DEMO_REF);
    expect(output).toContain(
      `${DEMO_MIGRATION_055_FILENAME}  sha256=`,
    );
    expect(output).toContain("tx=normalized_transaction_wrapper");
    expect(() => validateDryRunDemoMigrationConfig(baseEnv())).not.toThrow();
    expect(() =>
      validateDryRunDemoMigrationConfig(
        baseEnv({
          DEMO_SUPABASE_DATABASE_URL: undefined,
          DEMO_SUPABASE_SSL_ROOT_CERT_PATH: undefined,
        }),
      ),
    ).not.toThrow();
  });

  it("fails apply confirmation when typed reference does not match", () => {
    expect(() => assertApplyConfirmation("wrong-ref", DEMO_REF)).toThrow(/confirmation must exactly match/i);
  });
});

describe("database-backed ledger behavior", () => {
  it("skips when database ledger has the same hash", () => {
    const first = DEMO_REQUIRED_MIGRATION_ORDER[0];
    const planEntry = loadRequiredMigrationPlan()[0];
    const action = assertDatabaseLedgerCompatible(
      {
        filename: first,
        sha256: planEntry.sha256,
        applied_at: "2026-01-01T00:00:00.000Z",
        runner_version: "demo-migrate-v1",
      },
      first,
      planEntry.sha256,
    );
    expect(action).toBe("skip");
  });

  it("rejects changed-hash ledger entries", () => {
    expect(() =>
      assertDatabaseLedgerCompatible(
        {
          filename: "006_abraxas_id.sql",
          sha256: hashMigrationContent("old"),
          applied_at: "2026-01-01T00:00:00.000Z",
          runner_version: "demo-migrate-v1",
        },
        "006_abraxas_id.sql",
        hashMigrationContent("new"),
      ),
    ).toThrow(/hash mismatch/i);
  });

  it("rolls back ledger insert when migration SQL fails inside atomic transaction", async () => {
    const mock = createMockDatabase({
      failOnQuery: (sql) => {
        if (sql.includes("006_abraxas_id")) {
          throw new Error("migration failed with password=plain-secret");
        }
      },
    });

    await expect(
      mock.executor.withTransaction(async (tx) => {
        await tx.query("-- 006_abraxas_id.sql body");
        await insertDatabaseLedgerRow(tx, {
          filename: "006_abraxas_id.sql",
          sha256: hashMigrationContent("body"),
        });
      }),
    ).rejects.toThrow(/migration failed/i);

    expect(mock.ledger.size).toBe(0);
  });

  it("inserts ledger row atomically with migration SQL for atomic_wrapper files", async () => {
    const mock = createMockDatabase();
    const sha = hashMigrationContent("select 1;");
    await mock.executor.withTransaction(async (tx) => {
      await tx.query("select 1;");
      await insertDatabaseLedgerRow(tx, {
        filename: "006_abraxas_id.sql",
        sha256: sha,
      });
    });
    expect(mock.ledger.get("006_abraxas_id.sql")?.sha256).toBe(sha);
  });

  it("refuses concurrent runs when advisory lock is unavailable", async () => {
    const mock = createMockDatabase({ locked: true });
    const config = validateApplyDemoMigrationConfig(baseEnv());

    await expect(
      applyDemoMigrations({
        config,
        confirmation: DEMO_REF,
        env: baseEnv(),
        createClient: async () => mock.executor,
      }),
    ).rejects.toThrow(/advisory lock/i);

    expect(mock.state.lockHeld).toBe(false);
    expect(mock.state.ended).toBe(true);
  });

  it("releases advisory lock after failure", async () => {
    let migrationSqlSeen = 0;
    const mock = createMockDatabase({
      failOnQuery: (sql) => {
        if (
          !sql.includes("demo_ops") &&
          !sql.includes("advisory") &&
          sql !== "BEGIN" &&
          sql !== "COMMIT" &&
          sql !== "ROLLBACK"
        ) {
          migrationSqlSeen += 1;
          if (migrationSqlSeen > 1) {
            throw new Error("stop on first migration error");
          }
        }
      },
    });
    const config = validateApplyDemoMigrationConfig(baseEnv());

    await expect(
      applyDemoMigrations({
        config,
        confirmation: DEMO_REF,
        env: baseEnv(),
        createClient: async () => mock.executor,
      }),
    ).rejects.toThrow(/Migration failed|stop on first migration error/i);

    expect(mock.state.lockHeld).toBe(false);
    expect(mock.state.ended).toBe(true);
  });

  it("initializes demo_ops ledger on empty database before applying", async () => {
    const queries: string[] = [];
    const mock = createMockDatabase({
      failOnQuery: (sql) => {
        queries.push(sql);
        if (
          !sql.includes("demo_ops") &&
          !sql.includes("advisory") &&
          sql !== "BEGIN" &&
          sql !== "COMMIT" &&
          sql !== "ROLLBACK"
        ) {
          throw new Error("halt after init");
        }
      },
    });
    const config = validateApplyDemoMigrationConfig(baseEnv());

    await expect(
      applyDemoMigrations({
        config,
        confirmation: DEMO_REF,
        env: baseEnv(),
        createClient: async () => mock.executor,
      }),
    ).rejects.toThrow(/halt after init/i);

    expect(queries).toContain(DEMO_OPS_LEDGER_INIT_SQL);
  });

  it("redacts plain-text and URL-encoded database passwords", () => {
    const plain = redactDatabaseSecrets(
      "failed: postgresql://postgres:plain-secret@db.ocntwbxarpjeixdnzide.supabase.co:5432/postgres",
      {},
    );
    expect(plain).not.toContain("plain-secret");
    expect(plain).toContain("<redacted:password>");

    const encoded = redactDatabaseSecrets(`failed: ${ENCODED_DB_URL}`, {
      ...baseEnv(),
      DEMO_SUPABASE_DATABASE_URL: ENCODED_DB_URL,
    });
    expect(encoded).not.toContain("p@ss:word");
    expect(encoded).toContain("<redacted:DEMO_SUPABASE_DATABASE_URL>");
  });
});

describe("055 normalized_transaction_wrapper apply behavior", () => {
  it("records the original source sha256 in the database ledger", async () => {
    const plan = loadRequiredMigrationPlan();
    const entry = plan.find((item) => item.file === DEMO_MIGRATION_055_FILENAME);
    expect(entry?.transactionMode).toBe("normalized_transaction_wrapper");

    const sourceSql = readFileSync(entry!.absolutePath, "utf8");
    const { executionSql, sourceSha256 } = normalize055MigrationForAtomicExecution(
      DEMO_MIGRATION_055_FILENAME,
      sourceSql,
    );
    expect(sourceSha256).toBe(entry!.sha256);

    const mock = createMockDatabase();
    await mock.executor.withTransaction(async (tx) => {
      await tx.query(executionSql);
      await insertDatabaseLedgerRow(tx, {
        filename: entry!.file,
        sha256: entry!.sha256,
      });
    });

    expect(mock.ledger.get(DEMO_MIGRATION_055_FILENAME)?.sha256).toBe(entry!.sha256);
    expect(mock.ledger.get(DEMO_MIGRATION_055_FILENAME)?.sha256).toBe(sourceSha256);
  });

  it("rolls back 055 ledger insert when normalized migration SQL fails", async () => {
    const plan = loadRequiredMigrationPlan();
    const entry = plan.find((item) => item.file === DEMO_MIGRATION_055_FILENAME);
    expect(entry).toBeDefined();

    const mock = createMockDatabase({
      failOnQuery: (sql) => {
        if (sql.includes("enforce_partner_policy_immutability")) {
          throw new Error("055 migration failed");
        }
      },
    });

    for (const filename of DEMO_REQUIRED_MIGRATION_ORDER.slice(
      0,
      DEMO_REQUIRED_MIGRATION_ORDER.indexOf(DEMO_MIGRATION_055_FILENAME),
    )) {
      const planEntry = plan.find((item) => item.file === filename);
      if (!planEntry) continue;
      mock.ledger.set(filename, {
        filename,
        sha256: planEntry.sha256,
        applied_at: "2026-01-01T00:00:00.000Z",
        runner_version: "demo-migrate-v1",
      });
    }

    const config = validateApplyDemoMigrationConfig(baseEnv());
    await expect(
      applyDemoMigrations({
        config,
        confirmation: DEMO_REF,
        env: baseEnv(),
        createClient: async () => mock.executor,
      }),
    ).rejects.toThrow(/055 migration failed/i);

    expect(mock.ledger.has(DEMO_MIGRATION_055_FILENAME)).toBe(false);
  });

  it("aborts when the source hash changes between plan and apply", () => {
    const plan = loadRequiredMigrationPlan();
    const entry = plan.find((item) => item.file === DEMO_MIGRATION_055_FILENAME);
    expect(entry).toBeDefined();

    expect(() =>
      assertMigrationContentMatchesPlan(
        { ...entry!, sha256: hashMigrationContent("stale-plan-hash") },
        readFileSync(entry!.absolutePath, "utf8"),
      ),
    ).toThrow(/hash changed during apply planning/i);
  });
});
