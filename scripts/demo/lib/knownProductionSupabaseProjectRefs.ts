// FILE: scripts/demo/lib/knownProductionSupabaseProjectRefs.ts
// Immutable Production Supabase project denylist — not overridable by environment variables.
//
// Update this list only via an explicit repository PR when the production Supabase
// project is created or rotated. Operator-entered PRODUCTION_SUPABASE_PROJECT_REF must
// match a value here; the denylist cannot be weakened through env configuration.

/**
 * Production Supabase project refs used by abraxasworld.xyz / this deployment.
 *
 * Project refs are public hostname identifiers (deployment identifiers), not secret
 * credentials. Do not add anon keys, service-role keys, database passwords, or signing keys.
 */
export const KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS = Object.freeze([
  "bztwutzprwsdrtqdpymf",
] as const satisfies readonly string[]);
