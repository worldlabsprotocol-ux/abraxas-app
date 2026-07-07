// FILE: lib/supabase/admin.ts
// Service-role Supabase client for server routes.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, { auth: { persistSession: false } });
  }
  return cached;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase not configured");
  return sb;
}
