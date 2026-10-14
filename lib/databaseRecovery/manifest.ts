// FILE: lib/databaseRecovery/manifest.ts

import { createHash } from "node:crypto";

export const BACKUP_MANIFEST_VERSION = 1 as const;
export const BACKUP_TOOL_VERSION = "abraxas-pg-backup/1.0.0";

export interface AbraxasBackupManifest {
  manifest_version: typeof BACKUP_MANIFEST_VERSION;
  tool_version: string;
  created_at: string;
  database_identity: {
    supabase_project_ref: string;
    postgres_database: string;
  };
  schema_snapshot: {
    supabase_migration_versions: string[];
  };
  inventory_hash_sha256: string;
  integrity_hash_sha256: string;
  inventory: Record<string, string>;
  integrity: {
    idv_aggregate: string;
    subjects_aggregate: string;
    wallets_aggregate: string;
  };
  artifact: {
    format: "pg_dump_custom_encrypted";
    plaintext_sha256: string;
    ciphertext_sha256: string;
    encryption: "aes-256-gcm-v1";
    dump_filename: string;
    ciphertext_filename: string;
  };
}

export function sha256FileHex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
