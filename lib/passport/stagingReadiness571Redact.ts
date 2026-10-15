// FILE: lib/passport/stagingReadiness571Redact.ts

/** Redact credentials from database URLs for audit output. */
export function redactDatabaseConnectionLabel(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "unconfigured";
  try {
    const normalized = trimmed.replace(/^postgresql:/i, "http:");
    const parsed = new URL(normalized);
    const host = parsed.hostname || "unknown-host";
    const port = parsed.port ? `:${parsed.port}` : "";
    const dbPath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `postgresql://***@${host}${port}${dbPath}`;
  } catch {
    return "postgresql://***";
  }
}
