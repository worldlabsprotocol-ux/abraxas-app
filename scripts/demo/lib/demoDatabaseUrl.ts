// FILE: scripts/demo/lib/demoDatabaseUrl.ts
// Parse and validate demo-only Postgres connection URLs without logging secrets.

import { DemoProjectGuardError, maskProjectRef } from "./demoProjectGuard";

const DIRECT_DB_HOST_PATTERN = /^db\.([a-z0-9-]+)\.supabase\.co$/i;
const POOLER_HOST_PATTERN = /pooler\.supabase\.com$/i;

export class DemoDatabaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoDatabaseUrlError";
  }
}

export interface ParsedDemoDatabaseUrl {
  projectRef: string;
  hostStyle: "direct";
}

/** Extract Supabase project ref from a direct Postgres connection URL. */
export function parseSupabaseProjectRefFromDatabaseUrl(databaseUrl: string): string {
  return parseDemoDatabaseUrl(databaseUrl).projectRef;
}

export function parseDemoDatabaseUrl(databaseUrl: string): ParsedDemoDatabaseUrl {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    throw new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL is not a valid URL");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL must use postgres:// or postgresql://");
  }

  if (POOLER_HOST_PATTERN.test(parsed.hostname)) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL must use the direct db.<project-ref>.supabase.co hostname — generic pooler URLs are not accepted",
    );
  }

  const hostMatch = DIRECT_DB_HOST_PATTERN.exec(parsed.hostname);
  if (!hostMatch?.[1]) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL must target db.<project-ref>.supabase.co",
    );
  }

  return {
    projectRef: hostMatch[1],
    hostStyle: "direct",
  };
}

export function assertDatabaseUrlMatchesDemoRef(databaseUrl: string, demoProjectRef: string): void {
  const parsedRef = parseSupabaseProjectRefFromDatabaseUrl(databaseUrl);
  if (parsedRef !== demoProjectRef.trim()) {
    throw new DemoProjectGuardError(
      "demo_ref_mismatch",
      `DEMO_SUPABASE_DATABASE_URL project ref (${maskProjectRef(parsedRef)}) does not match DEMO_SUPABASE_PROJECT_REF (${maskProjectRef(demoProjectRef)})`,
    );
  }
}

/** Mask a Postgres connection URL for operator logs without DNS lookup. */
export function maskDatabaseUrlFromProjectRef(projectRef: string): string {
  return `postgresql://***@${maskProjectRef(projectRef)}.supabase.co:****/postgres`;
}

export function maskDatabaseUrl(databaseUrl: string): string {
  try {
    const ref = parseSupabaseProjectRefFromDatabaseUrl(databaseUrl);
    return maskDatabaseUrlFromProjectRef(ref);
  } catch {
    return "<invalid-database-url>";
  }
}

function redactPasswordPatterns(text: string): string {
  let redacted = text;
  redacted = redacted.replace(
    /(postgres(?:ql)?:\/\/[^:\s]+:)([^@\s]+)(@)/gi,
    "$1<redacted:password>$3",
  );
  redacted = redacted.replace(
    /(postgres(?:ql)?:\/\/)([^:\s]+)(@)/gi,
    "$1<redacted:user>$3",
  );
  return redacted;
}

export function redactDatabaseSecrets(
  text: string,
  env: Record<string, string | undefined>,
): string {
  let redacted = text;
  const secretKeys = ["DEMO_SUPABASE_DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  for (const key of secretKeys) {
    const value = env[key];
    if (!value || value.length === 0) continue;
    redacted = redacted.split(value).join(`<redacted:${key}>`);
    try {
      redacted = redacted.split(decodeURIComponent(value)).join(`<redacted:${key}>`);
    } catch {
      // ignore malformed URI encoding in env values
    }
  }
  return redactPasswordPatterns(redacted);
}
