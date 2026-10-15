// FILE: lib/supabase/projectRefs.ts
// Public Supabase project ref helpers (hostname identifiers only).

export const DEMO_SUPABASE_PROJECT_REF = "ocntwbxarpjeixdnzide";

export const KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS = Object.freeze([
  "bztwutzprwsdrtqdpymf",
] as const);

export function supabaseProjectRefFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Resolve Supabase project ref from a direct Postgres or session pooler URL (hostname only, no credentials). */
export function supabaseProjectRefFromPostgresUrl(databaseUrl: string): string | null {
  try {
    const parsed = new URL(databaseUrl.trim());
    const host = parsed.hostname.toLowerCase();
    const direct = host.match(/^db\.([a-z0-9-]+)\.supabase\.co$/);
    if (direct?.[1]) return direct[1];
    if (host.endsWith(".pooler.supabase.com")) {
      const user = decodeURIComponent(parsed.username);
      const pooler = user.match(/^postgres\.([a-z0-9-]+)$/i);
      if (pooler?.[1]) return pooler[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function isKnownProductionSupabaseRef(ref: string | null): boolean {
  if (!ref) return false;
  return (KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS as readonly string[]).includes(ref);
}
