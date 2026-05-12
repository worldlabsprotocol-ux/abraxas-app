// FILE: lib/supabaseClient.ts
// Supabase client — single import point.
// Reads from NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
// If env vars missing, client is null and all hooks fall back to Zustand store.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const hasSupabase = !!supabase;