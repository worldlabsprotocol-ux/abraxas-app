/** SDK bundle stub — institutional verification never uses Supabase as trust root. */
function fail(): never {
  throw new Error("Supabase admin is not available in @abraxas/institutional-verification");
}

export function requireSupabaseAdmin(): never {
  return fail();
}

export function getSupabaseAdmin(): never {
  return fail();
}
