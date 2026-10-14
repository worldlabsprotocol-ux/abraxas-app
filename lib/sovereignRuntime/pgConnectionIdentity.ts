// FILE: lib/sovereignRuntime/pgConnectionIdentity.ts
// Canonical Postgres endpoint identity (host, port, database) for restore safety.

export type PostgresEndpoint = {
  host: string;
  port: number;
  database: string;
};

export type PostgresEndpointParseIssue = {
  code: string;
  message: string;
};

const LOOPBACK_ALIASES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeHost(raw: string): string {
  const h = raw.trim().toLowerCase();
  if (LOOPBACK_ALIASES.has(h)) return "loopback";
  if (h.startsWith("[") && h.endsWith("]")) return h.slice(1, -1).toLowerCase();
  return h;
}

/** Parse postgresql/postgres URL into canonical endpoint (ignores credentials and query params). */
export function parsePostgresEndpoint(
  urlRaw: string | undefined | null,
): { ok: true; endpoint: PostgresEndpoint } | { ok: false; issue: PostgresEndpointParseIssue } {
  const trimmed = urlRaw?.trim();
  if (!trimmed) {
    return { ok: false, issue: { code: "missing_database_url", message: "Database URL is required" } };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed.replace(/^postgres(ql)?:/i, "http:"));
  } catch {
    return { ok: false, issue: { code: "invalid_database_url", message: "Database URL is not parseable" } };
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "") || "postgres");
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 5432;
  if (!Number.isFinite(port) || port <= 0) {
    return { ok: false, issue: { code: "invalid_database_port", message: "Database URL port is invalid" } };
  }

  return {
    ok: true,
    endpoint: {
      host: normalizeHost(parsed.hostname),
      port,
      database,
    },
  };
}

export function postgresEndpointsEqual(a: PostgresEndpoint, b: PostgresEndpoint): boolean {
  return a.host === b.host && a.port === b.port && a.database === b.database;
}

/** Fail closed when primary and restore resolve to the same physical database target. */
export function assertDistinctPostgresEndpoints(
  primaryUrl: string | undefined | null,
  restoreUrl: string | undefined | null,
): PostgresEndpointParseIssue | null {
  const primary = parsePostgresEndpoint(primaryUrl);
  if (!primary.ok) return primary.issue;
  const restore = parsePostgresEndpoint(restoreUrl);
  if (!restore.ok) return restore.issue;
  if (postgresEndpointsEqual(primary.endpoint, restore.endpoint)) {
    return {
      code: "restore_target_must_differ",
      message:
        "Restore target must not share host, port, and database with primary (URL formatting and credentials ignored)",
    };
  }
  return null;
}
