// FILE: lib/persistence/postgrestReachability.ts
// Detect CI/local placeholder PostgREST hosts that must not be treated as live persistence.

const PLACEHOLDER_SUPABASE_HOSTS = new Set(["placeholder.supabase.co"]);

export function isPlaceholderPostgrestUrl(postgrestUrl: string): boolean {
  const trimmed = postgrestUrl.trim();
  if (!trimmed) return true;
  try {
    return PLACEHOLDER_SUPABASE_HOSTS.has(new URL(trimmed).hostname.toLowerCase());
  } catch {
    return true;
  }
}

export function isPostgrestTransportErrorMessage(message: string | undefined): boolean {
  const m = message ?? "";
  return (
    m.includes("fetch failed")
    || m.includes("ENOTFOUND")
    || m.includes("ECONNREFUSED")
    || m.includes("ETIMEDOUT")
  );
}

/** CI/local example keys must not be treated as live Launchpad persistence. */
export function isPlaceholderServiceRoleKey(serviceRoleKey: string): boolean {
  const trimmed = serviceRoleKey.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower === "placeholder_service_role_key") return true;
  if (lower.includes("placeholder")) return true;
  if (trimmed.includes("ci-placeholder")) return true;
  return false;
}

export function isLaunchpadPersistenceMisconfigured(
  postgrestUrl: string,
  serviceRoleKey: string,
): boolean {
  return isPlaceholderPostgrestUrl(postgrestUrl) || isPlaceholderServiceRoleKey(serviceRoleKey);
}
