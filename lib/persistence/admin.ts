// FILE: lib/persistence/admin.ts
// Abraxas-owned persistence entry — Postgres authority, replaceable PostgREST transport.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolvePersistenceConfig } from "./env";
import type { AbraxasPersistenceClient } from "./types";

export class PersistenceConfigurationError extends Error {
  readonly code = "persistence_not_configured";

  constructor() {
    super("Abraxas persistence (PostgreSQL access) is not configured");
    this.name = "PersistenceConfigurationError";
  }
}

let cached: SupabaseClient | null = null;

/** Test-only: drop cached client so env changes take effect. */
export function resetPersistenceClientForTests(): void {
  cached = null;
}

function createPostgrestClient(): SupabaseClient | null {
  const cfg = resolvePersistenceConfig();
  if (!cfg.ok) return null;
  return createClient(cfg.postgrestUrl, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** @deprecated Prefer requirePersistenceAdmin for new identity and trust code. */
export function getSupabaseCompatibleAdmin(): SupabaseClient | null {
  if (!cached) cached = createPostgrestClient();
  return cached;
}

export function requirePersistenceAdmin(): AbraxasPersistenceClient {
  const client = getSupabaseCompatibleAdmin();
  if (!client) throw new PersistenceConfigurationError();
  return client;
}

export function getPersistenceAdmin(): AbraxasPersistenceClient | null {
  return getSupabaseCompatibleAdmin();
}
