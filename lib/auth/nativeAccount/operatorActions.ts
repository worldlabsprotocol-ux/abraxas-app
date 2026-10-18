// FILE: lib/auth/nativeAccount/operatorActions.ts
// Non-secret operator checklist derived from readiness blockers.

const ACTION_MAP: Record<string, string> = {
  sovereign_mode_required:
    "Set ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT=1 and ABRAXAS_PERSISTENCE_BACKEND=postgres_direct on Production, then redeploy.",
  sovereign_database_missing:
    "Configure ABRAXAS_DATABASE_URL to independent PostgreSQL (not *.supabase.co) and redeploy.",
  sovereign_supabase_host_rejected:
    "Point ABRAXAS_DATABASE_URL at Abraxas-controlled PostgreSQL; Supabase-hosted URLs are rejected in sovereign mode.",
  migration_144_missing:
    "Apply sovereign migrations (database/sovereign/migrations) via scripts/sovereign/apply-native-account-migrations.mjs — do not rely on legacy Supabase migration 144.",
  migration_146_missing:
    "Apply sovereign migration 002_native_account_solana_auth.sql (included in apply-native-account-migrations.mjs).",
  solana_network_not_configured:
    "Set NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta for Production (or confirm production default after deploy).",
  session_secret_missing:
    "Configure ABRAXAS_ACCOUNT_SESSION_SECRET (32+ characters) in Production.",
  memory_store_forbidden_in_production:
    "Remove ABRAXAS_NATIVE_ACCOUNT_MEMORY from Production.",
  persistence_not_configured:
    "Configure sovereign PostgreSQL persistence; PostgREST-only mode cannot satisfy native account schema in Production.",
};

export function buildNativeAuthOperatorActions(blockers: string[]): string[] {
  const seen = new Set<string>();
  const actions: string[] = [];
  for (const blocker of blockers) {
    const mapped = ACTION_MAP[blocker];
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      actions.push(mapped);
    }
  }
  if (blockers.includes("migration_144_missing") || blockers.includes("migration_146_missing")) {
    const migrate =
      "Provision independent PostgreSQL, run apply-native-account-migrations.mjs, verify abraxas_accounts and Solana challenge tables.";
    if (!seen.has(migrate)) actions.unshift(migrate);
  }
  if (blockers.includes("sovereign_mode_required")) {
    actions.unshift(
      "Provision independent PostgreSQL and secure Vercel connectivity before enabling sovereign Production sign-in.",
    );
  }
  return actions;
}
