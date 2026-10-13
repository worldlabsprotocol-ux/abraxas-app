// FILE: lib/supabase/admin.ts
// Legacy import path — delegates to Abraxas persistence admin (PostgreSQL via PostgREST).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseCompatibleAdmin,
  PersistenceConfigurationError,
  requirePersistenceAdmin,
} from "@/lib/persistence/admin";

export class SupabaseAdminConfigurationError extends Error {
  readonly code = "supabase_admin_not_configured";

  constructor() {
    super("Privileged database access is not configured");
    this.name = "SupabaseAdminConfigurationError";
  }
}

export function getSupabaseAdmin(): SupabaseClient | null {
  return getSupabaseCompatibleAdmin();
}

export function requireSupabaseAdmin(): SupabaseClient {
  try {
    return requirePersistenceAdmin();
  } catch (e) {
    if (e instanceof PersistenceConfigurationError) {
      throw new SupabaseAdminConfigurationError();
    }
    throw e;
  }
}
