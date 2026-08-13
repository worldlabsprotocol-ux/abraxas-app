// FILE: scripts/demo/lib/demoProvisionerConfig.ts
// Constants and non-secret configuration for the Partner Sandbox holder provisioner.

import { resolve } from "node:path";

export const DEMO_PROVISIONER_SCHEMA_VERSION = 1 as const;

/** Hours before screening expiry when apply may refresh only the screening claim. */
export const DEMO_SCREENING_REFRESH_WINDOW_HOURS = 4;

/** Minimum remaining screening validity required for rehearsal verify to pass. */
export const DEMO_MIN_REHEARSAL_VALIDITY_HOURS = 2;

/** Sandbox screening claim TTL (hours). */
export const DEMO_SCREENING_TTL_HOURS = 24;

/** Identity credential TTL (days) — matches issueIdentityCredential.ts. */
export const DEMO_CREDENTIAL_TTL_DAYS = 365;

export const DEMO_SANDBOX_HOLDER_STATE_PATH = resolve(
  process.cwd(),
  "scripts/demo/.sandbox-holder.json",
);

export const DEMO_STATE_FILE_MAX_BYTES = 4 * 1024;

/** Fixed UUID for dry-run illustrative output only — never persisted. */
export const DEMO_DRY_RUN_PROVISION_ID = "00000000-0000-4000-8000-000000000000";

export const DEMO_PROVISIONER_ADVISORY_LOCK_NAMESPACE = "abraxas:demo:provision";

export const DEMO_SYNTHETIC_JURISDICTION = "US";
export const DEMO_SYNTHETIC_DOCUMENT_TYPE = "passport";
export const DEMO_SYNTHETIC_DOCUMENT_COUNTRY = "US";

export const DEMO_MANUAL_EVIDENCE_PREFIX = "manual_review:";
export const DEMO_SANDBOX_EVIDENCE_PREFIX = "sandbox:provision:";

export const DEMO_PROVISIONER_SOURCE = "demoProvisioner";

export function sandboxEvidenceReference(provisionId: string): string {
  return `${DEMO_SANDBOX_EVIDENCE_PREFIX}${provisionId}`;
}

export function manualEvidenceReference(provisionId: string): string {
  return `${DEMO_MANUAL_EVIDENCE_PREFIX}${provisionId}`;
}

export function computeProvisionerAdvisoryLockKey(projectRef: string): number {
  let hash = 0;
  const input = `${DEMO_PROVISIONER_ADVISORY_LOCK_NAMESPACE}:${projectRef}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

export function resolveDemoProvisionerIssuer(
  env: Record<string, string | undefined>,
): string {
  const fromIssuer = env.ABRAXAS_ISSUER_URL?.trim();
  if (fromIssuer) return fromIssuer.replace(/\/$/, "");
  const fromApp = env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) return fromApp.replace(/\/$/, "");
  throw new Error(
    "ABRAXAS_ISSUER_URL or NEXT_PUBLIC_APP_URL is required for credential issuer resolution",
  );
}
