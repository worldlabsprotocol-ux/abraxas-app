import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { storeEncryptedEvidence, readEncryptedEvidence } from "@/lib/persistence/evidenceBlobStore";
import { registerEvidenceCustodyDirect } from "@/lib/persistence/idvDirectStore";
import { queryAbraxasPg, resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import {
  assertBackupSourceReady,
  collectBackupSnapshot,
  restoreFromManifestFile,
  runPgDump,
  verifyRestoredSnapshot,
  writeEncryptedBackupArtifact,
  cleanupTempDump,
} from "@/lib/databaseRecovery/pipeline";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";

const SOURCE_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

const RESTORE_URL = process.env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim()
  || process.env.ABRAXAS_RESTORE_DATABASE_URL?.trim()
  || undefined;

function applySovereignSchema(pgUrl: string): void {
  const migrationsDir = join(process.cwd(), "supabase/migrations");
  const files = [...SOVEREIGN_RUNTIME_SCHEMA_MANIFEST];
  for (const file of files) {
    execFileSync("psql", [pgUrl, "-v", "ON_ERROR_STOP=0"], {
      input: readFileSync(join(migrationsDir, file), "utf8"),
      encoding: "utf8",
    });
  }
}

describe("Build #556 sovereign encrypted backup and restore", () => {
  if (!SOURCE_URL || !RESTORE_URL) {
    it.skip("requires ABRAXAS_SOVEREIGN_PG_URL and ABRAXAS_SOVEREIGN_RESTORE_PG_URL", () => {});
    return;
  }

  let evidenceSource: string;
  let evidenceRestore: string;
  let backupDir: string;
  const key = randomBytes(32);

  beforeAll(() => {
    applySovereignSchema(SOURCE_URL!);
    applySovereignSchema(RESTORE_URL!);
    evidenceSource = mkdtempSync(join(tmpdir(), "abx-b556-ev-src-"));
    evidenceRestore = mkdtempSync(join(tmpdir(), "abx-b556-ev-rst-"));
    backupDir = mkdtempSync(join(tmpdir(), "abx-b556-backup-"));
  });

  afterAll(() => {
    rmSync(evidenceSource, { recursive: true, force: true });
    rmSync(evidenceRestore, { recursive: true, force: true });
    rmSync(backupDir, { recursive: true, force: true });
  });

  it("observed restore: pg_dump encrypt restore verifies inventory and evidence decrypts", async () => {
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = SOURCE_URL;
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceSource;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = key.toString("base64");
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();

    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
      authMethod: "evm_wallet",
    });
    expect(wallet.ok).toBe(true);
    if (!wallet.ok) return;

    const captureSessionId = `cap_${randomBytes(8).toString("hex")}`;
    const stored = storeEncryptedEvidence({
      holderSubjectId: wallet.subjectId,
      captureSessionId,
      artifactKind: "id_front",
      plaintext: Buffer.from("synthetic-idv-fixture-not-human"),
      env: process.env,
    });
    await registerEvidenceCustodyDirect({
      holderSubjectId: wallet.subjectId,
      captureSessionId,
      artifactKind: "id_front",
      storagePath: stored.storagePath,
      contentSha256: stored.contentSha256,
    });

    const sourceClient = await createRecoveryPgClient({ databaseUrl: SOURCE_URL, env: process.env });
    try {
      await assertBackupSourceReady(sourceClient);
      const snapshot = await collectBackupSnapshot(sourceClient);
      const stamp = `b556-${Date.now()}`;
      const dumpPath = join(backupDir, `${stamp}.dump`);
      runPgDump(SOURCE_URL!, dumpPath);
      const plaintext = readFileSync(dumpPath);
      rmSync(dumpPath, { force: true });

      const written = writeEncryptedBackupArtifact({
        outputDir: backupDir,
        projectRef: SOVEREIGN_DISPOSABLE_REF,
        stamp,
        snapshot,
        plaintext,
        key,
      });

      const sovereignEnv = {
        ...process.env,
        ABRAXAS_BACKUP_SCOPE: "sovereign",
      };

      const t0 = performance.now();
      const restored = restoreFromManifestFile(
        written.manifestPath,
        RESTORE_URL!,
        key.toString("base64"),
        sovereignEnv,
      );
      const restoreMs = Math.round(performance.now() - t0);

      cpSync(evidenceSource, evidenceRestore, { recursive: true });

      process.env.ABRAXAS_DATABASE_URL = RESTORE_URL;
      process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceRestore;
      resetAbraxasPgPoolForTests();
      resetPersistenceClientForTests();

      const verifyClient = await createRecoveryPgClient({ databaseUrl: RESTORE_URL, env: process.env });
      try {
        const verified = await verifyRestoredSnapshot(verifyClient, written.manifest);
        expect(verified.inventoryHash).toBe(snapshot.inventoryHash);
      } finally {
        await verifyClient.end();
      }

      const custody = await queryAbraxasPg<{ storage_path: string }>(
        `select storage_path from public.abraxas_evidence_custody
         where capture_session_id = $1 limit 1`,
        [captureSessionId],
      );
      const path = custody.rows[0]?.storage_path;
      expect(path).toBeTruthy();
      const dec = readEncryptedEvidence({ storagePath: path!, env: process.env });
      expect(dec.toString()).toBe("synthetic-idv-fixture-not-human");

      cleanupTempDump(restored.tmpDump);
      expect(restoreMs).toBeGreaterThan(0);
      console.info(JSON.stringify({ sovereign_restore_observed_ms: restoreMs }));
    } finally {
      await sourceClient.end();
    }
  });
});
