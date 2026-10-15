// FILE: lib/passport/build582/disposableTrustProofDatabase.ts
// Isolated disposable PostgreSQL for Build #582 institutional trust proof only.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";
import {
  DISPOSABLE_PG_TEST_URL_ENV,
  evaluateDisposablePgMigrationTestGuard,
} from "@/lib/persistence/disposablePgMigrationTestGuard";
import { SOVEREIGN_DISPOSABLE_DATABASE_ID } from "@/lib/persistence/disposablePgTestEnv";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";

export const BUILD582_TRUST_PROOF_DB_PREFIX = "abx_b582_trust_" as const;

export type Build582DisposableTrustProofBootstrap =
  | {
      ok: true;
      bootstrapDatabaseUrl: string;
      databaseIdentity: typeof SOVEREIGN_DISPOSABLE_DATABASE_ID;
      guardReason: "authorized";
    }
  | { ok: false; reason: string };

export function evaluateBuild582DisposableTrustProofBootstrap(
  env: Record<string, string | undefined> = process.env,
): Build582DisposableTrustProofBootstrap {
  if (env.ABRAXAS_DATABASE_URL?.trim() && !env[DISPOSABLE_PG_TEST_URL_ENV]?.trim()) {
    return {
      ok: false,
      reason: "ABRAXAS_DATABASE_URL cannot be used without explicit ABRAXAS_DISPOSABLE_PG_TEST_URL",
    };
  }

  const guard = evaluateDisposablePgMigrationTestGuard(env);
  if (!guard.ok) {
    return { ok: false, reason: guard.reason };
  }

  const ref = supabaseProjectRefFromPostgresUrl(guard.databaseUrl);
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) {
    return {
      ok: false,
      reason: `Production Supabase project ref ${PRODUCTION_SUPABASE_PROJECT_REF} is never permitted`,
    };
  }

  return {
    ok: true,
    bootstrapDatabaseUrl: guard.databaseUrl,
    databaseIdentity: SOVEREIGN_DISPOSABLE_DATABASE_ID,
    guardReason: "authorized",
  };
}

function postgresAdminUrl(databaseUrl: string): string {
  return databaseUrl.replace(/\/[^/]+$/, "/postgres");
}

function databaseUrlForName(bootstrapDatabaseUrl: string, dbName: string): string {
  return bootstrapDatabaseUrl.replace(/\/[^/]+$/, `/${dbName}`);
}

export function provisionBuild582IsolatedTrustProofDatabase(input: {
  bootstrapDatabaseUrl: string;
  dbName?: string;
}): { dbName: string; databaseUrl: string } {
  const bootstrap = evaluateBuild582DisposableTrustProofBootstrap({
    ...process.env,
    [DISPOSABLE_PG_TEST_URL_ENV]: input.bootstrapDatabaseUrl,
  });
  if (!bootstrap.ok) {
    throw new Error(bootstrap.reason);
  }

  const dbName = input.dbName ?? `${BUILD582_TRUST_PROOF_DB_PREFIX}${Date.now()}`;
  const admin = postgresAdminUrl(input.bootstrapDatabaseUrl);
  execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${dbName}"`], {
    encoding: "utf8",
  });
  return {
    dbName,
    databaseUrl: databaseUrlForName(input.bootstrapDatabaseUrl, dbName),
  };
}

export function applyBuild582TrustProofSchemaMigrations(databaseUrl: string): void {
  const bootstrap = evaluateBuild582DisposableTrustProofBootstrap({
    ...process.env,
    [DISPOSABLE_PG_TEST_URL_ENV]: databaseUrl,
  });
  if (!bootstrap.ok) {
    throw new Error(bootstrap.reason);
  }

  const dir = join(process.cwd(), "supabase/migrations");
  for (const file of SOVEREIGN_RUNTIME_SCHEMA_MANIFEST) {
    const sql = readFileSync(join(dir, file), "utf8");
    execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], {
      input: sql,
      encoding: "utf8",
    });
  }

  const tableCheck = execFileSync(
    "psql",
    [
      databaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      "select to_regclass('public.passport_institutional_authorization_commits') is not null",
    ],
    { encoding: "utf8" },
  ).trim();
  if (tableCheck !== "t") {
    throw new Error("Build #582 trust proof schema migration verification failed");
  }
}

export function dropBuild582IsolatedTrustProofDatabase(input: {
  bootstrapDatabaseUrl: string;
  dbName: string;
}): void {
  const admin = postgresAdminUrl(input.bootstrapDatabaseUrl);
  execFileSync(
    "psql",
    [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${input.dbName}" with (force)`],
    { encoding: "utf8" },
  );
}

/** Points runtime persistence at an isolated trust-proof database. Authorization env must already be set explicitly. */
export function applyBuild582TrustProofRuntimeEnv(databaseUrl: string): void {
  process.env[DISPOSABLE_PG_TEST_URL_ENV] = databaseUrl;
  process.env.ABRAXAS_DATABASE_URL = databaseUrl;
  process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
  process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
}

export function clearBuild582TrustProofRuntimeEnv(): void {
  delete process.env.ABRAXAS_DATABASE_URL;
  delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
  delete process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE;
}
