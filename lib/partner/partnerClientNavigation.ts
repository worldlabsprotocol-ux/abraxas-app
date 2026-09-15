// FILE: lib/partner/partnerClientNavigation.ts
// Client-side navigation guards for server-issued partner handoff redirects.
// Partner allowlist validation remains server-side on /api/v1/partner-flow/complete.

const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:", "blob:"]);

function decodeNavigationTarget(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function isSafePartnerHandoffRedirectUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("//")) return false;

  const decoded = decodeNavigationTarget(trimmed).trim().toLowerCase();
  if (decoded.startsWith("javascript:") || decoded.startsWith("data:") || decoded.startsWith("vbscript:")) {
    return false;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return !/[\0\\]/.test(trimmed);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol)) return false;
  if (protocol !== "https:" && protocol !== "http:") return false;
  if (protocol === "http:" && parsed.hostname !== "localhost") return false;
  return true;
}

export function navigateToPartnerHandoffRedirect(url: string): boolean {
  if (!isSafePartnerHandoffRedirectUrl(url)) return false;
  window.location.href = url;
  return true;
}
