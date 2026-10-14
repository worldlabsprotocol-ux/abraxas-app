// FILE: lib/sovereignRuntime/institutionalActivationEnv.ts
// Required env for Abraxas-operated sovereign deployment (no Supabase intermediary).

export type InstitutionalEnvIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type InstitutionalEnvReport = {
  ok: boolean;
  errors: InstitutionalEnvIssue[];
  warnings: InstitutionalEnvIssue[];
};

const REQUIRED_KEYS = [
  "ABRAXAS_PERSISTENCE_BACKEND",
  "ABRAXAS_DATABASE_URL",
  "ABRAXAS_EVIDENCE_STORAGE_ROOT",
  "ABRAXAS_EVIDENCE_ENCRYPTION_KEY",
  "ABRAXAS_SIGNING_KEY",
] as const;

function hasValue(env: Record<string, string | undefined>, key: string): boolean {
  return Boolean(env[key]?.trim());
}

function isValidEvidenceKey(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const buf = Buffer.from(raw.trim(), "base64");
    return buf.length === 32;
  } catch {
    return false;
  }
}

function looksLikeSigningJwk(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const parsed = JSON.parse(raw) as { kty?: string };
    return typeof parsed.kty === "string" && parsed.kty.length > 0;
  } catch {
    return false;
  }
}

/** Validates minimum sovereign institutional runtime configuration. */
export function validateInstitutionalSovereignEnv(
  env: Record<string, string | undefined> = process.env,
): InstitutionalEnvReport {
  const errors: InstitutionalEnvIssue[] = [];
  const warnings: InstitutionalEnvIssue[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!hasValue(env, key)) {
      errors.push({
        code: `missing_${key.toLowerCase()}`,
        severity: "error",
        message: `${key} is required for sovereign institutional activation`,
      });
    }
  }

  const backend = env.ABRAXAS_PERSISTENCE_BACKEND?.trim().toLowerCase();
  if (backend && backend !== "postgres_direct" && backend !== "pg") {
    errors.push({
      code: "invalid_persistence_backend",
      severity: "error",
      message: "ABRAXAS_PERSISTENCE_BACKEND must be postgres_direct for sovereign activation",
    });
  }

  if (!isValidEvidenceKey(env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY)) {
    errors.push({
      code: "invalid_evidence_encryption_key",
      severity: "error",
      message: "ABRAXAS_EVIDENCE_ENCRYPTION_KEY must be base64-encoded 32 bytes",
    });
  }

  if (!looksLikeSigningJwk(env.ABRAXAS_SIGNING_KEY)) {
    errors.push({
      code: "invalid_signing_key",
      severity: "error",
      message: "ABRAXAS_SIGNING_KEY must be a JSON Ed25519 private JWK",
    });
  }

  if (!hasValue(env, "ABRAXAS_BACKUP_ENCRYPTION_KEY")) {
    warnings.push({
      code: "missing_backup_encryption_key",
      severity: "warning",
      message: "ABRAXAS_BACKUP_ENCRYPTION_KEY not set — encrypted pg_dump backups will fail until configured",
    });
  }

  if (!hasValue(env, "ABRAXAS_SOVEREIGN_RESTORE_PG_URL") && !hasValue(env, "ABRAXAS_RESTORE_DATABASE_URL")) {
    warnings.push({
      code: "missing_restore_database_url",
      severity: "warning",
      message: "No restore PostgreSQL URL — recovery drills and Build #556 restore certification skipped",
    });
  }

  if (hasValue(env, "NEXT_PUBLIC_SUPABASE_URL") || hasValue(env, "SUPABASE_SERVICE_ROLE_KEY")) {
    warnings.push({
      code: "supabase_env_present",
      severity: "warning",
      message: "Supabase env vars are set; sovereign identity path should not depend on them at runtime",
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}
