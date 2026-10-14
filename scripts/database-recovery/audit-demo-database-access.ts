#!/usr/bin/env npx tsx
// FILE: scripts/database-recovery/audit-demo-database-access.ts
// Read-only audit: confirms demo guard + Postgres reachability without dumping data.

import { assertDemoBackupScope } from "@/lib/databaseRecovery/guard";
import { fetchRecoveryInventory, fetchSupabaseMigrationVersions } from "@/lib/databaseRecovery/pgInventory";
import { validateReadOnlyDemoConfig, maskSupabaseUrl } from "@/scripts/demo/lib/demoProjectGuard";
import { createDemoPgClient } from "@/scripts/demo/lib/demoPgClient";
import { maskDatabaseUrl, redactDatabaseSecrets } from "@/scripts/demo/lib/demoDatabaseUrl";

async function main(): Promise<void> {
  const env = process.env;
  const guard = validateReadOnlyDemoConfig(env);

  let databaseConfigured = false;
  let postgresReachable = false;
  let pgDumpReady = false;
  let inventory: Record<string, string> = {};
  let migrationTail: string[] = [];

  try {
    assertDemoBackupScope(env);
    databaseConfigured = true;
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      stage: "backup_scope",
      error: redactDatabaseSecrets(error instanceof Error ? error.message : String(error), env),
      demo_ref: guard.demoProjectRef,
      supabase_url: maskSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    }));
    process.exit(1);
  }

  const { databaseUrl, demoProjectRef } = assertDemoBackupScope(env);
  const client = await createDemoPgClient({ databaseUrl, env });
  try {
    await client.query("select 1");
    postgresReachable = true;
    const rows = await fetchRecoveryInventory(client);
    inventory = Object.fromEntries(rows.map((r) => [r.label, r.n]));
    migrationTail = (await fetchSupabaseMigrationVersions(client)).slice(-5);
    pgDumpReady = true;
  } finally {
    await client.end();
  }

  console.log(JSON.stringify({
    ok: true,
    demo_ref: demoProjectRef,
    supabase_url: maskSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    database_target: maskDatabaseUrl(databaseUrl),
    postgres_reachable: postgresReachable,
    pg_dump_ready: pgDumpReady,
    inventory,
    migration_versions_tail: migrationTail,
    notes: [
      "Supabase REST/service-role JWT does not substitute for DEMO_SUPABASE_DATABASE_URL",
      "Use Session Pooler (5432) or direct db.<ref>.supabase.co with verified TLS",
    ],
  }));
}

main().catch((error) => {
  console.error(redactDatabaseSecrets(error instanceof Error ? error.message : String(error), process.env));
  process.exit(1);
});
