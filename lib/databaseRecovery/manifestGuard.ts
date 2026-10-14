// FILE: lib/databaseRecovery/manifestGuard.ts

import { basename } from "node:path";
import type { AbraxasBackupManifest } from "./manifest";
import { BACKUP_MANIFEST_VERSION } from "./manifest";
import { AUTHORIZED_DEMO_REF } from "./guard";
import {
  assertRefNotProductionTarget,
  collectProductionDeniedRefs,
  validateReadOnlyDemoConfig,
} from "@/scripts/demo/lib/demoProjectGuard";

export function assertManifestArtifactBinding(manifestPath: string, manifest: AbraxasBackupManifest): void {
  const encPath = manifestPath.replace(/\.manifest\.json$/i, "");
  const ciphertextBase = basename(encPath);
  if (ciphertextBase !== manifest.artifact.ciphertext_filename) {
    throw new Error("manifest ciphertext filename does not match backup artifact path");
  }
  if (manifest.artifact.format !== "pg_dump_custom_encrypted") {
    throw new Error("unsupported backup artifact format");
  }
  if (manifest.artifact.encryption !== "aes-256-gcm-v1") {
    throw new Error("unsupported backup encryption scheme");
  }
}

/** Fail closed unless manifest identity matches authorized demo (never production). */
export function assertManifestBackupIdentity(
  manifest: AbraxasBackupManifest,
  env: Record<string, string | undefined> = process.env,
): void {
  validateReadOnlyDemoConfig(env);
  if (manifest.manifest_version !== BACKUP_MANIFEST_VERSION) {
    throw new Error("unsupported backup manifest version");
  }

  const demoRef = env.DEMO_SUPABASE_PROJECT_REF?.trim() ?? AUTHORIZED_DEMO_REF;
  const manifestRef = manifest.database_identity.supabase_project_ref.trim();

  if (manifestRef !== AUTHORIZED_DEMO_REF) {
    throw new Error("backup manifest database identity is not the authorized demo project");
  }
  if (manifestRef !== demoRef) {
    throw new Error("backup manifest project ref does not match DEMO_SUPABASE_PROJECT_REF");
  }

  const denied = collectProductionDeniedRefs(env);
  assertRefNotProductionTarget(manifestRef, denied);
}
