// FILE: lib/sui/zklogin/serverEmail.ts
// Server-side Google email lookup + backfill for sui_zklogin_identities.

import type { SupabaseClient } from "@supabase/supabase-js";
import { emailFromIdToken } from "./emailFromToken";

export async function backfillZkLoginEmail(
  supabase: SupabaseClient,
  suiAddress: string,
  email: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("sui_zklogin_identities")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("sui_address", suiAddress);

  if (error) {
    console.error("[zklogin/email] backfill failed", error.message);
    return false;
  }
  return true;
}

/**
 * Read email from DB; if missing, decode id_token from the active OAuth session and persist.
 */
export async function ensureZkLoginEmailForCapture(
  supabase: SupabaseClient,
  suiAddress: string,
  idToken?: string | null,
): Promise<string | null> {
  const { data: zkRow } = await supabase
    .from("sui_zklogin_identities")
    .select("email")
    .eq("sui_address", suiAddress)
    .maybeSingle();

  const existing = zkRow?.email?.trim();
  if (existing?.includes("@")) return existing;

  if (!idToken?.trim()) return null;

  const fromJwt = emailFromIdToken(idToken);
  if (!fromJwt) return null;

  const saved = await backfillZkLoginEmail(supabase, suiAddress, fromJwt);
  return saved ? fromJwt : null;
}
