// FILE: lib/partner/partnerClientNavigation.ts
// Client-side navigation guards for server-issued partner handoff redirects.
// Partner allowlist validation remains server-side on /api/v1/partner-flow/complete.

import { isKnownInternalPartnerReturnPath } from "@/lib/partner/partnerSandboxCallback";

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

/** Same-origin relative or absolute paths must map to a real in-app partner return route. */
export function isNavigablePartnerHandoffRedirectUrl(
  raw: string,
  origin: string = typeof window !== "undefined" ? window.location.origin : "https://placeholder.local",
): boolean {
  if (!isSafePartnerHandoffRedirectUrl(raw)) return false;
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = trimmed.startsWith("/") ? new URL(trimmed, origin) : new URL(trimmed);
  } catch {
    return false;
  }
  const appOrigin = origin.replace(/\/$/, "");
  if (parsed.origin.replace(/\/$/, "") !== appOrigin) return true;
  return isKnownInternalPartnerReturnPath(parsed.pathname);
}

export function navigateToPartnerHandoffRedirect(url: string): boolean {
  if (!isNavigablePartnerHandoffRedirectUrl(url)) return false;
  window.location.href = url;
  return true;
}
