#!/usr/bin/env npx tsx
// FILE: scripts/database-recovery/rehearse-idv-manifest-on-restore.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appendBackupAuditLog } from "@/lib/databaseRecovery/auditLog";
import { hashIntegrity, hashInventory } from "@/lib/databaseRecovery/fingerprints";
import { assertDisposableRestoreTarget } from "@/lib/databaseRecovery/guard";
import { DEMO_IDV_ACTIVATION_MANIFEST } from "@/lib/databaseRecovery/idvActivationManifest";
import { fetchRecoveryIntegrity, fetchRecoveryInventory } from "@/lib/databaseRecovery/pgInventory";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { redactDatabaseSecrets } from "@/scripts/demo/lib/demoDatabaseUrl";

async function applySql(client: Awaited<ReturnType<typeof createRecoveryPgClient>>, file: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
  await client.query(sql);
}

async function main(): Promise<void> {
  const env = process.env;
  const restoreUrl = env.ABRAXAS_RESTORE_DATABASE_URL?.trim();
  if (!restoreUrl) throw new Error("ABRAXAS_RESTORE_DATABASE_URL is required");

  assertDisposableRestoreTarget(restoreUrl, env);
  const outputDir = env.ABRAXAS_BACKUP_OUTPUT_DIR?.trim() || ".abraxas-backups/demo";

  const client = await createRecoveryPgClient({ databaseUrl: restoreUrl, env });
  try {
    const beforeInventory = await fetchRecoveryInventory(client);
    const beforeIntegrity = await fetchRecoveryIntegrity(client);
    const beforeInventoryHash = hashInventory(beforeInventory);
    const beforeIntegrityHash = hashIntegrity(beforeIntegrity);

    for (const file of DEMO_IDV_ACTIVATION_MANIFEST) {
      await applySql(client, file);
    }
    for (const file of DEMO_IDV_ACTIVATION_MANIFEST) {
      await applySql(client, file);
    }

    const afterInventory = await fetchRecoveryInventory(client);
    const afterIntegrity = await fetchRecoveryIntegrity(client);
    const afterInventoryHash = hashInventory(afterInventory);
    const afterIntegrityHash = hashIntegrity(afterIntegrity);

    if (afterInventoryHash !== beforeInventoryHash) {
      throw new Error("IDV manifest rehearsal changed inventory counts");
    }
    if (afterIntegrityHash !== beforeIntegrityHash) {
      throw new Error("IDV manifest rehearsal changed integrity fingerprints");
    }

    const tables = await client.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema = 'public'
        and table_name in ('passport_documents','identity_review_sessions','identity_biometric_assessments')
      order by 1;
    `);
    if (tables.rows.length !== 3) {
      throw new Error("expected IDV tables after rehearsal");
    }

    appendBackupAuditLog(outputDir, "idv_rehearsal_completed", {
      manifest_files: DEMO_IDV_ACTIVATION_MANIFEST.length,
      inventory_preserved: true,
    });

    console.log(JSON.stringify({
      ok: true,
      idv_tables: tables.rows.map((r) => r.table_name),
      inventory_hash_sha256: afterInventoryHash,
      integrity_hash_sha256: afterIntegrityHash,
    }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(redactDatabaseSecrets(error instanceof Error ? error.message : String(error), process.env));
  process.exit(1);
});
