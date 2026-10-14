// FILE: lib/sovereignRuntime/sovereignStagingConstants.ts

import { createHash } from "node:crypto";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";

/** Persistent sovereign staging database identity (Build #558). */
export const SOVEREIGN_STAGING_DATABASE_ID = "abraxas_sovereign_staging";

/** Monotonic sovereign schema bundle label for staging runbooks. */
export const SOVEREIGN_RUNTIME_SCHEMA_VERSION = "sovereign-runtime-v558";

export function sovereignRuntimeSchemaFingerprint(): string {
  const payload = SOVEREIGN_RUNTIME_SCHEMA_MANIFEST.join("\n");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
