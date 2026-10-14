import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDisposableRestoreTarget } from "./guard";
import {
  collectBackupSnapshot,
  runPgDump,
  writeEncryptedBackupArtifact,
  restoreFromManifestFile,
  verifyRestoredSnapshot,
  cleanupTempDump,
} from "./pipeline";
import { createRecoveryPgClient } from "./pgClient";
import { probeRecoveryInventoryReady } from "./pgInventory";
import { AUTHORIZED_DEMO_REF } from "./guard";

const SOURCE_URL =
  process.env.ABRAXAS_RECOVERY_INTEGRATION_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.DATABASE_URL?.trim()
  || undefined;

describe("databaseRecovery disposable backup restore cycle", () => {
  if (!SOURCE_URL) {
    it.skip("requires ABRAXAS_RECOVERY_INTEGRATION_PG_URL or MIGRATION_136_PG_URL", () => {});
    return;
  }

  let inventoryReady = false;
  beforeAll(async () => {
    const client = await createRecoveryPgClient({ databaseUrl: SOURCE_URL, env: process.env });
    try {
      inventoryReady = await probeRecoveryInventoryReady(client);
    } finally {
      await client.end();
    }
  });

  const outputDir = mkdtempSync(join(tmpdir(), "abraxas-backup-test-"));
  afterAll(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  it(
    "encrypts pg_dump, restores to disposable Postgres, and verifies fingerprints",
    async ({ skip }) => {
      if (!inventoryReady) {
        skip(true);
      }
      assertDisposableRestoreTarget(SOURCE_URL!);

      const key = randomBytes(32);
      const keyB64 = key.toString("base64");

      const sourceClient = await createRecoveryPgClient({
        databaseUrl: SOURCE_URL,
        env: process.env,
      });
      let tmpDump: string | undefined;
      try {
        const snapshot = await collectBackupSnapshot(sourceClient);
        const stamp = `integration-${Date.now()}`;
        const dumpPath = join(outputDir, `${stamp}.dump`);
        runPgDump(SOURCE_URL, dumpPath);
        const plain = readFileSync(dumpPath);
        rmSync(dumpPath, { force: true });

        const written = writeEncryptedBackupArtifact({
          outputDir,
          projectRef: AUTHORIZED_DEMO_REF,
          stamp,
          snapshot,
          plaintext: plain,
          key,
        });

        const integrationEnv = {
          ...process.env,
          DEMO_SUPABASE_PROJECT_REF: AUTHORIZED_DEMO_REF,
          PRODUCTION_SUPABASE_PROJECT_REF: "bztwutzprwsdrtqdpymf",
          NEXT_PUBLIC_SUPABASE_URL: `https://${AUTHORIZED_DEMO_REF}.supabase.co`,
        };
        const restored = restoreFromManifestFile(
          written.manifestPath,
          SOURCE_URL,
          keyB64,
          integrationEnv,
        );
        tmpDump = restored.tmpDump;

        const verifyClient = await createRecoveryPgClient({
          databaseUrl: SOURCE_URL,
          env: process.env,
        });
        try {
          const verified = await verifyRestoredSnapshot(verifyClient, written.manifest);
          expect(verified.inventoryHash).toBe(snapshot.inventoryHash);
          expect(verified.integrityHash).toBe(snapshot.integrityHash);
        } finally {
          await verifyClient.end();
        }
      } finally {
        await sourceClient.end();
        if (tmpDump) cleanupTempDump(tmpDump);
      }
    },
    300_000,
  );
});
