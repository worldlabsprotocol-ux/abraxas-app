// FILE: lib/sovereignRuntime/sovereignActivationPolicy.ts
// Sovereign deployment gates — disposable certification vs institutional readiness.

import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";

export type SovereignEnvClass = "disposable" | "institutional";

export type SovereignActivationIssue = {
  code: string;
  message: string;
};

const B64URL = /^[A-Za-z0-9_-]+$/;

const DEMO_PROJECT_REF_DENY = "ocntwbxarpjeixdnzide";

export function parseSovereignEnvClass(
  env: Record<string, string | undefined>,
): SovereignEnvClass | null {
  const raw = env.ABRAXAS_SOVEREIGN_ENV_CLASS?.trim().toLowerCase();
  if (raw === "disposable" || raw === "institutional") return raw;
  return null;
}

/** Validates Ed25519 private JWK material (not merely `kty`). */
export function validateEd25519PrivateJwk(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  const jwk = parsed as Record<string, unknown>;
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519") return false;
  if (typeof jwk.d !== "string" || typeof jwk.x !== "string") return false;
  if (!B64URL.test(jwk.d) || !B64URL.test(jwk.x)) return false;
  if (jwk.d.length < 32 || jwk.x.length < 32) return false;
  return true;
}

export function isValid32ByteBase64Key(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    return Buffer.from(raw.trim(), "base64").length === 32;
  } catch {
    return false;
  }
}

function databaseUrl(env: Record<string, string | undefined>): string | null {
  return (
    env.ABRAXAS_DATABASE_URL?.trim()
    ?? env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
    ?? null
  );
}

function isLocalhostHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export function assertTlsReadyForInstitutional(
  env: Record<string, string | undefined>,
): SovereignActivationIssue | null {
  const urlRaw = databaseUrl(env);
  if (!urlRaw) {
    return { code: "missing_database_url", message: "ABRAXAS_DATABASE_URL is required" };
  }
  let host = "";
  try {
    host = new URL(urlRaw.replace(/^postgresql:/, "http:")).hostname;
  } catch {
    return { code: "invalid_database_url", message: "ABRAXAS_DATABASE_URL is not a valid URL" };
  }
  if (isLocalhostHost(host)) {
    return null;
  }
  const ssl = env.ABRAXAS_PG_SSL?.trim().toLowerCase();
  if (ssl !== "require" && ssl !== "true" && ssl !== "1") {
    return {
      code: "tls_required",
      message: "Non-localhost institutional databases require ABRAXAS_PG_SSL=require",
    };
  }
  if (env.ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED?.trim() === "0") {
    return {
      code: "tls_verify_disabled",
      message: "ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED=0 is not permitted for institutional activation",
    };
  }
  return null;
}

/** Blocks migration against wrong/unauthorized database targets. */
export function validateSovereignDatabaseIdentity(
  env: Record<string, string | undefined>,
): SovereignActivationIssue | null {
  const id = env.ABRAXAS_SOVEREIGN_DATABASE_ID?.trim();
  if (!id) {
    return {
      code: "missing_database_identity",
      message: "ABRAXAS_SOVEREIGN_DATABASE_ID is required (explicit database identity)",
    };
  }

  const envClass = parseSovereignEnvClass(env);
  if (envClass === "disposable" && id !== SOVEREIGN_DISPOSABLE_REF) {
    return {
      code: "disposable_identity_mismatch",
      message: `Disposable certification requires ABRAXAS_SOVEREIGN_DATABASE_ID=${SOVEREIGN_DISPOSABLE_REF}`,
    };
  }

  const url = databaseUrl(env)?.toLowerCase() ?? "";
  if (url.includes(DEMO_PROJECT_REF_DENY)) {
    return {
      code: "shared_demo_database_denied",
      message: "Refusing sovereign operations against authorized demo Supabase project ref in URL",
    };
  }

  if (envClass === "institutional" && id === SOVEREIGN_DISPOSABLE_REF) {
    return {
      code: "institutional_disposable_identity_denied",
      message: "Institutional activation cannot use disposable database identity",
    };
  }

  return null;
}

export function assertSovereignMigrationAuthorized(
  env: Record<string, string | undefined>,
): SovereignActivationIssue[] {
  const errors: SovereignActivationIssue[] = [];

  if (env.ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED?.trim() !== "true") {
    errors.push({
      code: "migration_not_authorized",
      message:
        "Set ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED=true after explicit operator review (migrations are destructive)",
    });
  }

  const envClass = parseSovereignEnvClass(env);
  if (!envClass) {
    errors.push({
      code: "missing_env_class",
      message: "ABRAXAS_SOVEREIGN_ENV_CLASS must be disposable or institutional",
    });
  }

  const identityErr = validateSovereignDatabaseIdentity(env);
  if (identityErr) errors.push(identityErr);

  if (envClass === "institutional") {
    const operator = env.ABRAXAS_SOVEREIGN_OPERATOR_AUTHORIZATION?.trim();
    const expected = env.ABRAXAS_SOVEREIGN_OPERATOR_AUTHORIZATION_EXPECTED?.trim();
    if (!operator || !expected || operator !== expected) {
      errors.push({
        code: "operator_authorization_required",
        message:
          "Institutional migrations require matching ABRAXAS_SOVEREIGN_OPERATOR_AUTHORIZATION and _EXPECTED",
      });
    }
  }

  return errors;
}

export type DisposableCertificationReport = {
  ok: boolean;
  tier: "DISPOSABLE_CERTIFIED" | "BLOCKED";
  errors: SovereignActivationIssue[];
};

export function validateDisposableCertificationEnv(
  env: Record<string, string | undefined>,
): DisposableCertificationReport {
  const errors: SovereignActivationIssue[] = [];

  if (parseSovereignEnvClass(env) !== "disposable") {
    errors.push({
      code: "not_disposable_env",
      message: "ABRAXAS_SOVEREIGN_ENV_CLASS must be disposable for certification",
    });
  }

  errors.push(...assertSovereignMigrationAuthorized(env));

  if (env.ABRAXAS_PERSISTENCE_BACKEND?.trim().toLowerCase() !== "postgres_direct") {
    errors.push({
      code: "invalid_persistence_backend",
      message: "ABRAXAS_PERSISTENCE_BACKEND must be postgres_direct",
    });
  }

  if (!databaseUrl(env)) {
    errors.push({ code: "missing_database_url", message: "ABRAXAS_DATABASE_URL is required" });
  }

  return {
    ok: errors.length === 0,
    tier: errors.length === 0 ? "DISPOSABLE_CERTIFIED" : "BLOCKED",
    errors,
  };
}

export type InstitutionalReadinessReport = {
  ok: boolean;
  tier: "INSTITUTIONAL_READY" | "BLOCKED";
  errors: SovereignActivationIssue[];
  notes: string[];
};

export function validateInstitutionalReadinessEnv(
  env: Record<string, string | undefined>,
): InstitutionalReadinessReport {
  const errors: SovereignActivationIssue[] = [];
  const notes = [
    "Synthetic IDV certification does not establish Production human verification or institutional go-live alone.",
  ];

  if (parseSovereignEnvClass(env) !== "institutional") {
    errors.push({
      code: "not_institutional_env",
      message: "ABRAXAS_SOVEREIGN_ENV_CLASS must be institutional for activation",
    });
  }

  const identityErr = validateSovereignDatabaseIdentity(env);
  if (identityErr) errors.push(identityErr);

  if (env.ABRAXAS_PERSISTENCE_BACKEND?.trim().toLowerCase() !== "postgres_direct") {
    errors.push({
      code: "invalid_persistence_backend",
      message: "ABRAXAS_PERSISTENCE_BACKEND must be postgres_direct",
    });
  }

  if (!databaseUrl(env)) {
    errors.push({ code: "missing_database_url", message: "ABRAXAS_DATABASE_URL is required" });
  }

  if (!env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim()) {
    errors.push({
      code: "missing_evidence_root",
      message: "ABRAXAS_EVIDENCE_STORAGE_ROOT is required",
    });
  }

  if (!isValid32ByteBase64Key(env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY)) {
    errors.push({
      code: "invalid_evidence_encryption_key",
      message: "ABRAXAS_EVIDENCE_ENCRYPTION_KEY must be base64-encoded 32 bytes",
    });
  }

  if (!isValid32ByteBase64Key(env.ABRAXAS_BACKUP_ENCRYPTION_KEY)) {
    errors.push({
      code: "missing_backup_encryption_key",
      message: "ABRAXAS_BACKUP_ENCRYPTION_KEY is required for institutional backup custody",
    });
  }

  if (!validateEd25519PrivateJwk(env.ABRAXAS_SIGNING_KEY)) {
    errors.push({
      code: "invalid_signing_key",
      message: "ABRAXAS_SIGNING_KEY must be a valid Ed25519 private JWK (OKP, crv, d, x)",
    });
  }

  const restore =
    env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim()
    || env.ABRAXAS_RESTORE_DATABASE_URL?.trim();
  if (!restore) {
    errors.push({
      code: "missing_restore_database_url",
      message: "Recovery drill target (ABRAXAS_SOVEREIGN_RESTORE_PG_URL) is required",
    });
  }

  const tlsErr = assertTlsReadyForInstitutional(env);
  if (tlsErr) errors.push(tlsErr);

  if (env.ABRAXAS_BACKUP_SCOPE?.trim() !== "sovereign") {
    errors.push({
      code: "backup_scope_required",
      message: "ABRAXAS_BACKUP_SCOPE=sovereign is required for institutional backups",
    });
  }

  if (!env.ABRAXAS_BACKUP_OUTPUT_DIR?.trim()) {
    errors.push({
      code: "missing_backup_output_dir",
      message: "ABRAXAS_BACKUP_OUTPUT_DIR is required",
    });
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    errors.push({
      code: "supabase_env_forbidden",
      message: "Supabase env must be unset on institutional sovereign identity services",
    });
  }

  return {
    ok: errors.length === 0,
    tier: errors.length === 0 ? "INSTITUTIONAL_READY" : "BLOCKED",
    errors,
    notes,
  };
}

/** Compose file hardening checks (static). */
export function validateSovereignComposeHardening(composeText: string): SovereignActivationIssue[] {
  const errors: SovereignActivationIssue[] = [];
  if (/POSTGRES_PASSWORD:\s*\$\{SOVEREIGN_POSTGRES_PASSWORD:-/.test(composeText)) {
    errors.push({
      code: "compose_default_password",
      message: "Docker Compose must not ship a default PostgreSQL password",
    });
  }
  if (!/127\.0\.0\.1:\$\{SOVEREIGN_POSTGRES_PORT/.test(composeText)
    && !/127\.0\.0\.1:5432:5432/.test(composeText)) {
    errors.push({
      code: "compose_public_bind",
      message: "PostgreSQL must bind to loopback (127.0.0.1) by default",
    });
  }
  return errors;
}
