// FILE: lib/supabase.ts
// Supabase client — single import point for all server/client usage.
// Requires: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env.
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = url && key ? createClient(url, key) : null;

// Server-side admin client (service role — NEVER expose to browser)
export function createAdminClient() {
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !sKey) return null;
  return createClient(url, sKey, { auth: { autoRefreshToken:false, persistSession:false } });
}