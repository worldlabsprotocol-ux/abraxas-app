import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptBackupCiphertext, encryptBackupPlaintext, parseBackupEncryptionKey } from "./encryption";
import { AUTHORIZED_DEMO_REF } from "./guard";
import { assertManifestArtifactBinding, assertManifestBackupIdentity } from "./manifestGuard";
import type { AbraxasBackupManifest } from "./manifest";
import { BACKUP_MANIFEST_VERSION, BACKUP_TOOL_VERSION, sha256FileHex } from "./manifest";
import { loadAndDecryptBackup } from "./pipeline";

const GUARD_ENV: Record<string, string> = {
  DEMO_SUPABASE_PROJECT_REF: AUTHORIZED_DEMO_REF,
  PRODUCTION_SUPABASE_PROJECT_REF: "bztwutzprwsdrtqdpymf",
  NEXT_PUBLIC_SUPABASE_URL: `https://${AUTHORIZED_DEMO_REF}.supabase.co`,
};

function sampleManifest(overrides: Partial<AbraxasBackupManifest> = {}): AbraxasBackupManifest {
  return {
    manifest_version: BACKUP_MANIFEST_VERSION,
    tool_version: BACKUP_TOOL_VERSION,
    created_at: new Date().toISOString(),
    database_identity: {
      supabase_project_ref: AUTHORIZED_DEMO_REF,
      postgres_database: "postgres",
    },
    schema_snapshot: { supabase_migration_versions: [] },
    inventory_hash_sha256: "a".repeat(64),
    integrity_hash_sha256: "b".repeat(64),
    inventory: {},
    integrity: { idv_aggregate: "", subjects_aggregate: "", wallets_aggregate: "" },
    artifact: {
      format: "pg_dump_custom_encrypted",
      plaintext_sha256: "c".repeat(64),
      ciphertext_sha256: "d".repeat(64),
      encryption: "aes-256-gcm-v1",
      dump_filename: "demo.dump",
      ciphertext_filename: "demo.dump.enc",
    },
    ...overrides,
  };
}

describe("databaseRecovery security — AES-256-GCM", () => {
  it("uses a fresh random nonce for each encryption", () => {
    const key = parseBackupEncryptionKey(randomBytes(32).toString("base64"));
    const plain = Buffer.from("same-plaintext");
    const enc1 = encryptBackupPlaintext(plain, key);
    const enc2 = encryptBackupPlaintext(plain, key);
    expect(enc1.equals(enc2)).toBe(false);
    expect(enc1.subarray(0, 12).equals(enc2.subarray(0, 12))).toBe(false);
  });

  it("rejects truncated ciphertext", () => {
    const key = parseBackupEncryptionKey(randomBytes(32).toString("base64"));
    expect(() => decryptBackupCiphertext(Buffer.from([1, 2, 3]), key)).toThrow(/too short/);
  });

  it("rejects tampered auth tag with wrong key or bit flip", () => {
    const key = parseBackupEncryptionKey(randomBytes(32).toString("base64"));
    const wrongKey = parseBackupEncryptionKey(randomBytes(32).toString("base64"));
    const enc = encryptBackupPlaintext(Buffer.from("tamper-test"), key);
    expect(() => decryptBackupCiphertext(enc, wrongKey)).toThrow();

    const tampered = Buffer.from(enc);
    tampered[20] ^= 0xff;
    expect(() => decryptBackupCiphertext(tampered, key)).toThrow();
  });
});

describe("databaseRecovery security — manifest identity", () => {
  it("accepts authorized demo manifest identity", () => {
    expect(() => assertManifestBackupIdentity(sampleManifest(), GUARD_ENV)).not.toThrow();
  });

  it("rejects production project ref in manifest", () => {
    expect(() =>
      assertManifestBackupIdentity(
        sampleManifest({
          database_identity: { supabase_project_ref: "bztwutzprwsdrtqdpymf", postgres_database: "postgres" },
        }),
        GUARD_ENV,
      ),
    ).toThrow(/authorized demo/);
  });

  it("rejects manifest path not bound to ciphertext filename", () => {
    const dir = mkdtempSync(join(tmpdir(), "abraxas-manifest-bind-"));
    try {
      const manifest = sampleManifest();
      const manifestPath = join(dir, "wrong-name.manifest.json");
      writeFileSync(manifestPath, JSON.stringify(manifest));
      expect(() => assertManifestArtifactBinding(manifestPath, manifest)).toThrow(/does not match/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("databaseRecovery security — restore load path", () => {
  it("rejects tampered ciphertext hash before decrypt", () => {
    const dir = mkdtempSync(join(tmpdir(), "abraxas-restore-sec-"));
    try {
      const key = randomBytes(32);
      const keyB64 = key.toString("base64");
      const plain = Buffer.from("pg-custom-format-bytes");
      const ciphertext = encryptBackupPlaintext(plain, key);
      const encName = "demo-ocntwbxarpjeixdnzide-test.dump.enc";
      const encPath = join(dir, encName);
      writeFileSync(encPath, ciphertext);

      const manifest = sampleManifest({
        artifact: {
          format: "pg_dump_custom_encrypted",
          plaintext_sha256: sha256FileHex(plain),
          ciphertext_sha256: sha256FileHex(ciphertext),
          encryption: "aes-256-gcm-v1",
          dump_filename: "demo-ocntwbxarpjeixdnzide-test.dump",
          ciphertext_filename: encName,
        },
      });
      const manifestPath = `${encPath}.manifest.json`;
      writeFileSync(manifestPath, JSON.stringify(manifest));

      const tampered = Buffer.from(ciphertext);
      tampered[tampered.length - 1] ^= 0x01;
      writeFileSync(encPath, tampered);

      expect(() => loadAndDecryptBackup(manifestPath, keyB64, GUARD_ENV)).toThrow(/integrity failure/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects wrong decryption key after hash match", () => {
    const dir = mkdtempSync(join(tmpdir(), "abraxas-restore-key-"));
    try {
      const key = randomBytes(32);
      const wrongKeyB64 = randomBytes(32).toString("base64");
      const plain = Buffer.from("pg-custom-format-bytes");
      const ciphertext = encryptBackupPlaintext(plain, key);
      const encName = "demo-ocntwbxarpjeixdnzide-key.dump.enc";
      const encPath = join(dir, encName);
      writeFileSync(encPath, ciphertext);

      const manifest = sampleManifest({
        artifact: {
          format: "pg_dump_custom_encrypted",
          plaintext_sha256: sha256FileHex(plain),
          ciphertext_sha256: sha256FileHex(ciphertext),
          encryption: "aes-256-gcm-v1",
          dump_filename: "demo-ocntwbxarpjeixdnzide-key.dump",
          ciphertext_filename: encName,
        },
      });
      const manifestPath = `${encPath}.manifest.json`;
      writeFileSync(manifestPath, JSON.stringify(manifest));

      expect(() => loadAndDecryptBackup(manifestPath, wrongKeyB64, GUARD_ENV)).toThrow(/decryption failed/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
