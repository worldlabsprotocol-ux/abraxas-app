// FILE: lib/persistence/types.ts
// Provider-neutral persistence surface (Postgres semantics; transport replaceable).

import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST adapter today; replaceable with direct `pg` implementing the same call sites over time. */
export type AbraxasPersistenceClient = SupabaseClient;

export type PersistenceBackend = "supabase_postgrest" | "postgres_direct";

export type PersistenceConfig =
  | {
      ok: true;
      backend: "supabase_postgrest";
      /** HTTP PostgREST base (Supabase or self-hosted). */
      postgrestUrl: string;
      serviceRoleKey: string;
    }
  | {
      ok: true;
      backend: "postgres_direct";
      postgrestUrl: "";
      serviceRoleKey: "";
      databaseUrl: string;
    }
  | { ok: false; code: "persistence_not_configured" };
