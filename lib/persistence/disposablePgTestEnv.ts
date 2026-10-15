// FILE: lib/persistence/disposablePgTestEnv.ts
// Env key names for authorized disposable PostgreSQL tests (no script imports).

export const DISPOSABLE_PG_TEST_DATABASE_ID_ENV = "ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID";
export const DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV = "ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED";
export const DISPOSABLE_PG_TEST_URL_ENV = "ABRAXAS_DISPOSABLE_PG_TEST_URL";

/** Matches SOVEREIGN_DISPOSABLE_REF in manifestGuard (lib-safe duplicate for client import boundaries). */
export const SOVEREIGN_DISPOSABLE_DATABASE_ID = "abraxas_sovereign_disposable";
