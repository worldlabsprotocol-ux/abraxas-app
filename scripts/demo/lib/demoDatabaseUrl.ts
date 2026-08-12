// FILE: scripts/demo/lib/demoDatabaseUrl.ts
// Parse and validate demo-only Postgres connection URLs without logging secrets.

import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "./knownProductionSupabaseProjectRefs";
import { DemoProjectGuardError, maskProjectRef } from "./demoProjectGuard";

const DIRECT_DB_HOST_PATTERN = /^db\.([a-z0-9-]+)\.supabase\.co$/i;
const SESSION_POOLER_HOST_SUFFIX = ".pooler.supabase.com";
const SESSION_POOLER_USERNAME_PATTERN = /^postgres\.([a-z0-9-]+)$/i;
const DIRECT_USERNAME = "postgres";
const REQUIRED_PORT = "5432";
const REQUIRED_DATABASE = "postgres";
const WEAK_SSL_MODES = new Set(["disable", "allow", "prefer"]);
const FORBIDDEN_POOLER_TLS_QUERY_PARAMS = new Set([
  "sslmode",
  "ssl",
  "sslrootcert",
  "sslcert",
  "sslkey",
  "sslcompression",
]);

export class DemoDatabaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoDatabaseUrlError";
  }
}

export type DemoDatabaseTransport = "direct" | "supabase_session_pooler";

export interface ParsedDemoDatabaseUrl {
  projectRef: string;
  transport: DemoDatabaseTransport;
  poolerHostname?: string;
}

function parsePostgresUrl(databaseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    throw new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL is not a valid URL");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL must use postgres:// or postgresql://");
  }

  return parsed;
}

function resolvedPort(parsed: URL): string {
  return parsed.port || REQUIRED_PORT;
}

function assertPortAndDatabase(parsed: URL): void {
  const port = resolvedPort(parsed);
  if (port === "6543") {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL port 6543 is the transaction pooler — only session pooler port 5432 is supported",
    );
  }
  if (port !== REQUIRED_PORT) {
    throw new DemoDatabaseUrlError(
      `DEMO_SUPABASE_DATABASE_URL port must be ${REQUIRED_PORT}`,
    );
  }

  const database = parsed.pathname.replace(/^\//, "");
  if (database !== REQUIRED_DATABASE) {
    throw new DemoDatabaseUrlError(
      `DEMO_SUPABASE_DATABASE_URL database must be ${REQUIRED_DATABASE}`,
    );
  }
}

function assertNoPoolerTlsQueryParams(parsed: URL): void {
  for (const key of parsed.searchParams.keys()) {
    if (FORBIDDEN_POOLER_TLS_QUERY_PARAMS.has(key.toLowerCase())) {
      throw new DemoDatabaseUrlError(
        "DEMO_SUPABASE_DATABASE_URL session pooler connections must not include TLS query parameters — verified TLS is configured by the runner",
      );
    }
  }
}

function assertDirectTlsQueryParams(parsed: URL): void {
  for (const [key, value] of parsed.searchParams.entries()) {
    const normalizedKey = key.toLowerCase();
    const normalizedValue = value.toLowerCase();

    if (normalizedKey === "sslmode" && WEAK_SSL_MODES.has(normalizedValue)) {
      throw new DemoDatabaseUrlError(
        "DEMO_SUPABASE_DATABASE_URL query parameter sslmode weakens TLS",
      );
    }
    if (normalizedKey === "ssl" && (normalizedValue === "false" || normalizedValue === "0")) {
      throw new DemoDatabaseUrlError(
        "DEMO_SUPABASE_DATABASE_URL must not disable SSL",
      );
    }
  }
}

function assertSslRequired(parsed: URL, transport: DemoDatabaseTransport): void {
  if (transport === "supabase_session_pooler") {
    assertNoPoolerTlsQueryParams(parsed);
    return;
  }

  assertDirectTlsQueryParams(parsed);

  const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();
  const ssl = parsed.searchParams.get("ssl")?.toLowerCase();

  if (sslmode && WEAK_SSL_MODES.has(sslmode)) {
    throw new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL sslmode weakens TLS");
  }
  if (ssl === "false" || ssl === "0") {
    throw new DemoDatabaseUrlError("DEMO_SUPABASE_DATABASE_URL must not disable SSL");
  }
}

function isOfficialSessionPoolerHost(hostname: string): boolean {
  if (!hostname.endsWith(SESSION_POOLER_HOST_SUFFIX)) {
    return false;
  }

  const prefix = hostname.slice(0, hostname.length - SESSION_POOLER_HOST_SUFFIX.length);
  if (!prefix || prefix.endsWith(".")) {
    return false;
  }

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(hostname)) {
    return false;
  }

  return true;
}

function decodeUsername(parsed: URL): string {
  return decodeURIComponent(parsed.username);
}

function assertProjectRefNotDenied(projectRef: string): void {
  if ((KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS as readonly string[]).includes(projectRef)) {
    throw new DemoProjectGuardError(
      "target_is_production",
      `DEMO_SUPABASE_DATABASE_URL targets denied production project ref (${maskProjectRef(projectRef)})`,
    );
  }
}

function assertUsernameDoesNotEmbedProductionRef(username: string): void {
  for (const deniedRef of KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS) {
    if (username.includes(deniedRef)) {
      throw new DemoProjectGuardError(
        "target_is_production",
        `DEMO_SUPABASE_DATABASE_URL username must not embed production project ref (${maskProjectRef(deniedRef)})`,
      );
    }
  }
}

function parseDirectDatabaseUrl(parsed: URL): ParsedDemoDatabaseUrl {
  const hostMatch = DIRECT_DB_HOST_PATTERN.exec(parsed.hostname);
  if (!hostMatch?.[1]) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL must target db.<project-ref>.supabase.co for direct connections",
    );
  }

  const username = decodeUsername(parsed);
  if (username !== DIRECT_USERNAME) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL direct connections must use username postgres",
    );
  }

  const projectRef = hostMatch[1];
  assertProjectRefNotDenied(projectRef);
  assertPortAndDatabase(parsed);
  assertSslRequired(parsed, "direct");

  return {
    projectRef,
    transport: "direct",
  };
}

function parseSessionPoolerDatabaseUrl(parsed: URL): ParsedDemoDatabaseUrl {
  if (!isOfficialSessionPoolerHost(parsed.hostname)) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL must use an official Supabase Session Pooler hostname ending in .pooler.supabase.com",
    );
  }

  const username = decodeUsername(parsed);
  assertUsernameDoesNotEmbedProductionRef(username);

  if (username === DIRECT_USERNAME) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL session pooler connections must use username postgres.<demo-project-ref>",
    );
  }

  const usernameMatch = SESSION_POOLER_USERNAME_PATTERN.exec(username);
  if (!usernameMatch?.[1]) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL session pooler username must be exactly postgres.<demo-project-ref>",
    );
  }

  const projectRef = usernameMatch[1];
  assertProjectRefNotDenied(projectRef);
  assertPortAndDatabase(parsed);
  assertSslRequired(parsed, "supabase_session_pooler");

  return {
    projectRef,
    transport: "supabase_session_pooler",
    poolerHostname: parsed.hostname,
  };
}

/** Strip TLS query parameters so pg connection-string parsing cannot override explicit ssl options. */
export function buildSessionPoolerConnectionString(databaseUrl: string): string {
  const parsed = parsePostgresUrl(databaseUrl);
  for (const key of [...parsed.searchParams.keys()]) {
    if (FORBIDDEN_POOLER_TLS_QUERY_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
    }
  }
  return parsed.toString();
}

/** Extract Supabase project ref from an approved Postgres connection URL. */
export function parseSupabaseProjectRefFromDatabaseUrl(databaseUrl: string): string {
  return parseDemoDatabaseUrl(databaseUrl).projectRef;
}

export function parseDemoDatabaseUrl(databaseUrl: string): ParsedDemoDatabaseUrl {
  const parsed = parsePostgresUrl(databaseUrl);

  if (parsed.hostname.includes("pooler")) {
    return parseSessionPoolerDatabaseUrl(parsed);
  }

  return parseDirectDatabaseUrl(parsed);
}

export function assertDatabaseUrlMatchesDemoRef(databaseUrl: string, demoProjectRef: string): ParsedDemoDatabaseUrl {
  const parsed = parseDemoDatabaseUrl(databaseUrl);
  const expectedRef = demoProjectRef.trim();

  if (parsed.projectRef !== expectedRef) {
    throw new DemoProjectGuardError(
      "demo_ref_mismatch",
      `DEMO_SUPABASE_DATABASE_URL project ref (${maskProjectRef(parsed.projectRef)}) does not match DEMO_SUPABASE_PROJECT_REF (${maskProjectRef(expectedRef)})`,
    );
  }

  return parsed;
}

/** Mask database target for dry-run without a connection URL. */
export function maskDatabaseUrlFromProjectRef(projectRef: string): string {
  return `transport=unresolved project=${maskProjectRef(projectRef)}`;
}

export function maskDatabaseTransport(transport: DemoDatabaseTransport): string {
  return transport;
}

export function maskDatabaseTarget(parsed: ParsedDemoDatabaseUrl): string {
  return `transport=${maskDatabaseTransport(parsed.transport)} project=${maskProjectRef(parsed.projectRef)}`;
}

export function maskDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = parseDemoDatabaseUrl(databaseUrl);
    return maskDatabaseTarget(parsed);
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
  const secretKeys = [
    "DEMO_SUPABASE_DATABASE_URL",
    "DEMO_SUPABASE_SSL_ROOT_CERT_PATH",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
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
  return redactPasswordPatterns(redacted).replace(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    "<redacted:certificate>",
  );
}
