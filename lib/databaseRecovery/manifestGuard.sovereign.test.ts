import { describe, expect, it } from "vitest";
import { BACKUP_MANIFEST_VERSION } from "./manifest";
import { assertManifestBackupIdentity, SOVEREIGN_DISPOSABLE_REF } from "./manifestGuard";
import type { AbraxasBackupManifest } from "./manifest";

function minimalManifest(ref: string): AbraxasBackupManifest {
  return {
    manifest_version: BACKUP_MANIFEST_VERSION,
    tool_version: "test",
    created_at: new Date().toISOString(),
    database_identity: { supabase_project_ref: ref, postgres_database: "postgres" },
    schema_snapshot: { supabase_migration_versions: [] },
    inventory_hash_sha256: "a".repeat(64),
    integrity_hash_sha256: "b".repeat(64),
    inventory: {},
    integrity: { idv_aggregate: "0", subjects_aggregate: "0", wallets_aggregate: "0" },
    artifact: {
      format: "pg_dump_custom_encrypted",
      plaintext_sha256: "c".repeat(64),
      ciphertext_sha256: "d".repeat(64),
      encryption: "aes-256-gcm-v1",
      dump_filename: "x.dump",
      ciphertext_filename: "x.dump.enc",
    },
  };
}

describe("manifestGuard sovereign scope", () => {
  it("accepts sovereign disposable ref when ABRAXAS_BACKUP_SCOPE=sovereign", () => {
    expect(() =>
      assertManifestBackupIdentity(minimalManifest(SOVEREIGN_DISPOSABLE_REF), {
        ABRAXAS_BACKUP_SCOPE: "sovereign",
      }),
    ).not.toThrow();
  });

  it("rejects wrong ref under sovereign scope", () => {
    expect(() =>
      assertManifestBackupIdentity(minimalManifest("wrong_ref"), {
        ABRAXAS_BACKUP_SCOPE: "sovereign",
      }),
    ).toThrow(/sovereign backup manifest/);
  });
});
